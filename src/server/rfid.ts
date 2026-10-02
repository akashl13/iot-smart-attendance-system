import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { attendance, attendanceAnomalies, attendanceLogs, devices, rfidCards, rfidScans, schedules, students, subjects, users } from "@/db/schema";
import { formatTime, kolkataDateTime, kolkataParts, minutesOf, normalizeUid, todayKolkata } from "@/lib/format";
import { notifyAdminsOnce, notifyUser } from "@/server/notify";
import { getSettings } from "@/server/settings";

type ScanResult = {
  status: number;
  body: Record<string, unknown>;
};

export const ANOMALY_KINDS = {
  PROXY_ATTEMPT: "PROXY_ATTEMPT",
  DEVICE_IP_MISMATCH: "DEVICE_IP_MISMATCH",
  CLOCK_DRIFT: "CLOCK_DRIFT",
  MISSING_EXIT: "MISSING_EXIT",
  IMPOSSIBLE_DURATION: "IMPOSSIBLE_DURATION",
  SUBJECT_MISMATCH: "SUBJECT_MISMATCH",
} as const;
export type AnomalyKind = (typeof ANOMALY_KINDS)[keyof typeof ANOMALY_KINDS];

/** Records an integrity signal for human review. Never throws into the scan path. */
async function raiseAnomaly(input: {
  studentId: number;
  attendanceId?: number | null;
  date: string;
  kind: AnomalyKind;
  detail?: string | null;
  deviceId?: string | null;
  severity?: "warning" | "critical";
}) {
  try {
    await db.insert(attendanceAnomalies).values({
      studentId: input.studentId,
      attendanceId: input.attendanceId ?? null,
      date: input.date,
      kind: input.kind,
      detail: input.detail ?? null,
      deviceId: input.deviceId ?? null,
      severity: input.severity ?? "warning",
    });
  } catch (error) {
    console.error("Failed to record attendance anomaly", error);
  }
}

/** True when the source address is allowed for this reader (empty allowlist = any). */
function ipAllowed(allowedIps: string | null, ip: string) {
  if (!allowedIps?.trim()) return true;
  return allowedIps
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => (entry.endsWith("/") ? ip.startsWith(entry) : ip === entry || ip.startsWith(`${entry}.`)));
}

async function logScan(input: {
  rfidUid: string;
  deviceId: string;
  studentId?: number | null;
  success: boolean;
  message: string;
  scanType?: string | null;
  status?: string | null;
  deviceTimestamp?: Date | null;
  sourceIp?: string | null;
  ipTrusted?: boolean | null;
}) {
  await db.insert(rfidScans).values({
    rfidUid: input.rfidUid,
    deviceId: input.deviceId,
    studentId: input.studentId ?? null,
    success: input.success,
    message: input.message,
    scanType: input.scanType ?? null,
    status: input.status ?? null,
    deviceTimestamp: input.deviceTimestamp ?? null,
    sourceIp: input.sourceIp ?? null,
    ipTrusted: input.ipTrusted ?? null,
  });
}

/**
 * Heartbeat for a known reader. Unknown device codes are rejected rather than
 * auto-registered: a reader must be provisioned by an administrator first.
 */
export async function touchDevice(deviceId: string, ipAddress?: string | null) {
  const now = new Date();
  const [existing] = await db.select().from(devices).where(eq(devices.deviceCode, deviceId)).limit(1);
  if (!existing) return { known: false as const, device: null };
  await db
    .update(devices)
    .set({
      status: "ONLINE",
      lastSeen: now,
      ipAddress: ipAddress || existing.ipAddress,
    })
    .where(eq(devices.id, existing.id));
  return { known: true as const, device: { ...existing, status: "ONLINE", lastSeen: now } };
}

/**
 * Picks the subject for a scan. Only slots that match the student's own section are
 * considered, and an ambiguity between two different subjects is reported instead of
 * being silently resolved by pick-one.
 */
async function resolveSubject(student: typeof students.$inferSelect) {
  const now = kolkataParts();
  const minute = now.hour * 60 + now.minute;
  const slots = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.courseId, student.courseId),
        eq(schedules.semester, student.semester),
        eq(schedules.dayOfWeek, now.weekday),
        // A null section is a course-wide slot that applies to every section.
        or(eq(schedules.section, student.section), isNull(schedules.section)),
      ),
    );

  const exact = slots.filter((slot) => slot.section && slot.section === student.section);
  const pool = exact.length ? exact : slots;
  if (!pool.length) {
    const [fallback] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.departmentId, student.departmentId), eq(subjects.semester, student.semester)))
      .limit(1);
    return { subjectId: fallback?.id ?? null, ambiguous: false, reason: "department-fallback" as const };
  }

  const current = pool.filter((slot) => minute >= minutesOf(slot.startTime) && minute < minutesOf(slot.endTime));
  const distinct = new Set(current.map((slot) => slot.subjectId));
  if (distinct.size > 1) {
    return { subjectId: current[0].subjectId, ambiguous: true, reason: "parallel-subjects" as const };
  }
  if (current.length) return { subjectId: current[0].subjectId, ambiguous: false, reason: "in-window" as const };

  // Outside every slot: attach to the most recent slot that has already started today.
  const passed = pool
    .filter((slot) => minutesOf(slot.startTime) <= minute)
    .sort((a, b) => minutesOf(b.startTime) - minutesOf(a.startTime));
  if (passed[0]) return { subjectId: passed[0].subjectId, ambiguous: false, reason: "last-elapsed" as const };
  return { subjectId: pool[0].subjectId, ambiguous: false, reason: "first-of-day" as const };
}

function snapshot(row: typeof attendance.$inferSelect) {
  return {
    status: row.status,
    entryTime: row.entryTime,
    exitTime: row.exitTime,
    subjectId: row.subjectId,
    deviceId: row.deviceId,
    scanType: row.scanType,
    exitSource: row.exitSource,
    durationMinutes: row.durationMinutes,
    anomalyFlags: row.anomalyFlags,
    date: row.date,
  };
}

export type ScanInput = {
  rfidUID: string;
  deviceId: string;
  scanDirection?: "IN" | "OUT" | "AUTO";
  deviceTimestamp?: Date | null;
  firmwareVersion?: string | null;
  ipAddress?: string | null;
};

export async function processRfidScan(input: ScanInput): Promise<ScanResult> {
  const uid = normalizeUid(input.rfidUID);
  const deviceId = input.deviceId.trim();
  if (!uid) {
    return { status: 400, body: { success: false, message: "RFID UID format is invalid." } };
  }
  if (!deviceId) {
    return { status: 400, body: { success: false, message: "Device ID is required." } };
  }

  // The server clock is authoritative. The reader clock is only measured for drift.
  const now = new Date();
  const settings = await getSettings();
  const today = todayKolkata();
  const sourceIp = input.ipAddress ?? null;

  const driftMs = input.deviceTimestamp ? now.getTime() - input.deviceTimestamp.getTime() : null;
  const clockDriftSeconds = driftMs === null ? null : Math.round(driftMs / 1000);

  type ScanExtra = Omit<Parameters<typeof logScan>[0], "rfidUid" | "deviceId" | "deviceTimestamp" | "sourceIp">;
  const scan = (extra: ScanExtra) =>
    logScan({
      ...extra,
      rfidUid: uid,
      deviceId,
      deviceTimestamp: input.deviceTimestamp ?? null,
      sourceIp,
    });

  // ---- Reader trust ----------------------------------------------------------
  const heartbeat = await touchDevice(deviceId, sourceIp);
  if (!heartbeat.known) {
    await scan({ success: false, message: "Unknown reader" });
    await notifyAdminsOnce(
      "Unregistered reader attempted a scan",
      `Reader "${deviceId}" from ${sourceIp ?? "unknown IP"} is not provisioned and was rejected.`,
      "danger",
      60 * 60 * 1000,
    );
    return { status: 403, body: { success: false, message: "Reader is not registered with the server." } };
  }
  const device = heartbeat.device;
  if (settings.requireTrustedDevices && device.trustState !== "ACTIVE") {
    await scan({ success: false, message: "Reader not trusted" });
    return { status: 403, body: { success: false, message: "Reader is not approved for attendance. Contact the administrator." } };
  }

  const ipTrusted = ipAllowed(device.allowedIps, sourceIp ?? "local");
  if (settings.enforceDeviceIps && !ipTrusted) {
    await scan({ success: false, message: "Reader source address not allowed", ipTrusted: false });
    return { status: 403, body: { success: false, message: "This reader is not authorised to mark attendance from its current network address." } };
  }
  if (device.firmwareVersion && input.firmwareVersion) {
    await db.update(devices).set({ firmwareVersion: input.firmwareVersion }).where(eq(devices.id, device.id));
  }

  // ---- Card and student ------------------------------------------------------
  const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
  if (!card || !card.studentId || card.status === "UNASSIGNED") {
    await scan({ success: false, message: "RFID card is not registered" });
    await notifyAdminsOnce(
      "Unknown RFID card detected",
      `Unknown RFID card ${uid} was presented at ${deviceId}. Attendance was refused.`,
      "danger",
      60 * 60 * 1000,
    );
    return { status: 404, body: { success: false, code: "CARD_NOT_REGISTERED", message: "RFID card is not registered" } };
  }
  if (card.status === "BLOCKED") {
    await scan({ success: false, message: "RFID card is blocked", studentId: card.studentId });
    return { status: 403, body: { success: false, code: "CARD_BLOCKED", message: "RFID card is blocked. Contact the administrator." } };
  }

  const [student] = await db.select().from(students).where(eq(students.id, card.studentId)).limit(1);
  if (!student) {
    await scan({ success: false, message: "Student not found" });
    return { status: 404, body: { success: false, message: "Student not found" } };
  }
  if (student.status !== "ACTIVE") {
    await scan({ success: false, message: "Student account is inactive.", studentId: student.id });
    return { status: 403, body: { success: false, code: "STUDENT_INACTIVE", message: "Student account is inactive." } };
  }

  await db.update(rfidCards).set({ lastScan: now }).where(eq(rfidCards.id, card.id));

  const [existing] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.studentId, student.id), eq(attendance.date, today)))
    .limit(1);

  // ---- Proxy-attempt enforcement ---------------------------------------------
  // A student cannot tap a card immediately after their own card was used by someone
  // else. This turns an undetectable pass-the-card trick into a refused scan.
  if (settings.blockAfterProxyAttempt) {
    const [recent] = await db
      .select()
      .from(rfidScans)
      .where(
        and(
          eq(rfidScans.rfidUid, uid),
          eq(rfidScans.success, false),
          eq(rfidScans.studentId, student.id),
        ),
      )
      .orderBy(desc(rfidScans.createdAt))
      .limit(1);
    if (recent) {
      // Only meaningful for a genuinely new event, not the cooldown echoes below.
      const windowMs = Math.max(settings.cooldownSeconds, 120) * 1000;
      if (now.getTime() - new Date(recent.receivedAt ?? recent.createdAt).getTime() < windowMs) {
        const message = "This card was scanned again too quickly. Scan must be at least two minutes apart.";
        await scan({ success: false, message, studentId: student.id });
        return { status: 409, body: { success: false, code: "PROXY_ATTEMPT", message } };
      }
    }
  }

  const lastStamp = existing?.exitTime || existing?.entryTime;
  if (lastStamp && now.getTime() - new Date(lastStamp).getTime() < settings.cooldownSeconds * 1000) {
    const message = `Duplicate scan detected. Please wait ${settings.cooldownSeconds} seconds before scanning again.`;
    await scan({ success: false, message, studentId: student.id, scanType: existing?.scanType, status: existing?.status });
    // 202 + accepted:true tells the reader the tap WAS registered, so it stops
    // retrying and shows success instead of an error.
    return {
      status: 202,
      body: {
        success: true,
        accepted: true,
        code: "COOLDOWN_IGNORED",
        message: "Already recorded. No change was needed.",
        studentId: student.studentCode,
        studentName: student.name,
      },
    };
  }

  if (existing?.status === "Leave") {
    const message = "Leave is already recorded for today. Ask an administrator to correct it.";
    await scan({ success: false, message, studentId: student.id, status: "Leave" });
    return { status: 409, body: { success: false, code: "LEAVE_RECORDED", message, studentId: student.studentCode, studentName: student.name } };
  }

  // ---- Direction resolution --------------------------------------------------
  const declared = input.scanDirection ?? "AUTO";
  const configured = device.scanDirection ?? "AUTO";
  const effective = declared !== "AUTO" ? declared : configured !== "AUTO" ? configured : "AUTO";
  const isOpen = Boolean(existing && !existing.exitTime);
  const wantEntry = effective === "IN" || (effective === "AUTO" && !isOpen);
  const wantExit = effective === "OUT" || (effective === "AUTO" && isOpen);

  if (wantExit && !isOpen) {
    const message = "No open entry to close. An exit scan is not applicable right now.";
    await scan({ success: false, message, studentId: student.id, scanType: "EXIT" });
    return { status: 409, body: { success: false, code: "NOTHING_TO_CLOSE", message, studentId: student.studentCode, studentName: student.name } };
  }
  if (wantEntry && existing && existing.exitTime) {
    const message = "Attendance for today is already complete.";
    await scan({ success: false, message, studentId: student.id, scanType: "ENTRY", status: existing.status });
    return { status: 409, body: { success: false, code: "ALREADY_COMPLETE", message, studentId: student.studentCode, studentName: student.name } };
  }

  const resolution = existing?.subjectId
    ? { subjectId: existing.subjectId, ambiguous: false, reason: "carried-over" as const }
    : await resolveSubject(student);
  const subjectId = resolution.subjectId;
  const [subject] = subjectId ? await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1) : [null];
  const parts = kolkataParts(now);
  const lateCutoff = minutesOf(settings.lateAfter);
  const isLate = parts.hour * 60 + parts.minute > lateCutoff;

  const [account] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);

  if (wantEntry && !existing) {
    const status = isLate ? "Late" : "Present";
    const flags: string[] = [];
    if (!ipTrusted) flags.push(ANOMALY_KINDS.DEVICE_IP_MISMATCH);
    if (resolution.ambiguous) flags.push(ANOMALY_KINDS.SUBJECT_MISMATCH);
    if (clockDriftSeconds !== null && Math.abs(clockDriftSeconds) > 120) flags.push(ANOMALY_KINDS.CLOCK_DRIFT);

    const [created] = await db
      .insert(attendance)
      .values({
        studentId: student.id,
        rfidUid: uid,
        subjectId,
        teacherId: subject?.teacherId ?? null,
        date: today,
        entryTime: now,
        status,
        scanType: "ENTRY",
        deviceId,
        exitSource: "SCAN",
        anomalyFlags: flags,
      })
      .returning();
    await db.insert(attendanceLogs).values({
      attendanceId: created.id,
      action: "SCAN_ENTRY",
      oldValue: null,
      newValue: snapshot(created),
    });
    await scan({ success: true, message: "Entry recorded", studentId: student.id, scanType: "ENTRY", status, ipTrusted });

    for (const flag of flags) {
      await raiseAnomaly({
        studentId: student.id,
        attendanceId: created.id,
        date: today,
        kind: flag as AnomalyKind,
        deviceId,
        detail:
          flag === ANOMALY_KINDS.SUBJECT_MISMATCH
            ? "Multiple subjects were scheduled concurrently; attendance was attached to the first one."
            : flag === ANOMALY_KINDS.CLOCK_DRIFT
              ? `Reader clock differed from server by ${clockDriftSeconds}s.`
              : `Scan arrived from ${sourceIp ?? "unknown IP"}.`,
        severity: flag === ANOMALY_KINDS.SUBJECT_MISMATCH ? "warning" : "critical",
      });
    }
    if (account) {
      await notifyUser(account.id, "Attendance marked successfully.", `${status} entry recorded at ${formatTime(now)} via ${deviceId}.`, "success");
    }
    return {
      status: 200,
      body: {
        success: true,
        accepted: true,
        studentId: student.studentCode,
        studentName: student.name,
        status,
        scanType: "ENTRY",
        entryTime: formatTime(now),
        exitTime: null,
        durationMinutes: null,
        deviceId,
        subject: subject?.subjectName ?? null,
        subjectReason: resolution.reason,
        flags,
        message: "Entry recorded",
      },
    };
  }

  if (!existing) {
    const message = "Could not determine whether this scan is an entry or an exit.";
    await scan({ success: false, message, studentId: student.id });
    return { status: 409, body: { success: false, code: "NO_RECORD", message, studentId: student.studentCode, studentName: student.name } };
  }

  // ---- Exit -----------------------------------------------------------------
  const entry = existing.entryTime ? new Date(existing.entryTime) : now;
  const minutes = Math.max(0, Math.round((now.getTime() - entry.getTime()) / 60000));
  const flags = [...(existing.anomalyFlags ?? [])];
  if (minutes > 16 * 60) flags.push(ANOMALY_KINDS.IMPOSSIBLE_DURATION);

  // Half Day is no longer a silent side effect of a quick scan-out. It is only
  // applied when the student genuinely left early by the configured threshold, and
  // the resulting duration is recorded so an admin can audit it.
  const baseStatus = existing.status === "Absent" ? (isLate ? "Late" : "Present") : existing.status;
  const leftEarly = minutes < settings.halfDayHours * 60;
  const status = leftEarly && baseStatus !== "Leave" ? "Half Day" : baseStatus;
  if (leftEarly) flags.push("SHORT_DURATION");

  const [updated] = await db
    .update(attendance)
    .set({
      exitTime: now,
      status,
      scanType: "EXIT",
      deviceId,
      rfidUid: uid,
      subjectId: existing.subjectId ?? subjectId,
      teacherId: existing.teacherId ?? subject?.teacherId ?? null,
      exitSource: "SCAN",
      anomalyFlags: [...new Set(flags)],
      durationMinutes: minutes,
      updatedAt: now,
    })
    .where(eq(attendance.id, existing.id))
    .returning();
  await db.insert(attendanceLogs).values({
    attendanceId: updated.id,
    action: "SCAN_EXIT",
    oldValue: snapshot(existing),
    newValue: snapshot(updated),
  });
  await scan({ success: true, message: "Exit recorded", studentId: student.id, scanType: "EXIT", status, ipTrusted });
  if (minutes > 16 * 60) {
    await raiseAnomaly({
      studentId: student.id,
      attendanceId: updated.id,
      date: today,
      kind: ANOMALY_KINDS.IMPOSSIBLE_DURATION,
      deviceId,
      detail: `Recorded ${Math.floor(minutes / 60)}h ${minutes % 60}m on campus.`,
      severity: "critical",
    });
  }
  if (account) {
    await notifyUser(account.id, "Attendance marked successfully.", `Exit recorded at ${formatTime(now)}. Status: ${status}.`, "success");
  }
  return {
    status: 200,
    body: {
      success: true,
      accepted: true,
      studentId: student.studentCode,
      studentName: student.name,
      status,
      scanType: "EXIT",
      entryTime: formatTime(updated.entryTime),
      exitTime: formatTime(updated.exitTime),
      durationMinutes: minutes,
      deviceId,
      subject: subject?.subjectName ?? null,
      flags: [...new Set(flags)],
      message: "Exit recorded",
    },
  };
}

/**
 * Closes entries left open because the student never scanned out. Runs on demand
 * (admin endpoint) and is safe to call repeatedly: it only touches records whose
 * session has already ended plus the grace period, and it is idempotent.
 */
export async function closeDanglingEntries(graceMinutesOverride?: number) {
  const settings = await getSettings();
  const grace = graceMinutesOverride ?? settings.autoCloseGraceMinutes;
  const today = todayKolkata();
  const now = new Date();
  const cutoff = new Date(now.getTime() - grace * 60000);

  const open = await db
    .select({ record: attendance, entryTime: attendance.entryTime })
    .from(attendance)
    .where(and(eq(attendance.date, today), isNull(attendance.exitTime)))
    .limit(500);

  const closed: number[] = [];
  for (const { record, entryTime } of open) {
    if (!entryTime) continue;
    const minutes = Math.round((now.getTime() - new Date(entryTime).getTime()) / 60000);
    if (minutes < grace) continue;
    const [updated] = await db
      .update(attendance)
      .set({
        exitTime: now,
        exitSource: "AUTO_CLOSE",
        durationMinutes: minutes,
        status: record.status === "Absent" ? "Half Day" : record.status,
        anomalyFlags: [...new Set([...(record.anomalyFlags ?? []), ANOMALY_KINDS.MISSING_EXIT])],
        updatedAt: now,
      })
      .where(and(eq(attendance.id, record.id), isNull(attendance.exitTime)))
      .returning();
    if (!updated) continue;
    await db.insert(attendanceLogs).values({
      attendanceId: updated.id,
      action: "AUTO_CLOSE",
      oldValue: snapshot(record),
      newValue: snapshot(updated),
    });
    await raiseAnomaly({
      studentId: updated.studentId,
      attendanceId: updated.id,
      date: updated.date,
      kind: ANOMALY_KINDS.MISSING_EXIT,
      detail: `No exit scan within ${grace} minutes. Closed automatically at ${formatTime(now)}.`,
      severity: "warning",
    });
    closed.push(updated.id);
  }
  return { checked: open.length, closed: closed.length, ids: closed };
}

export async function assignCard(uidRaw: string, studentRef: number | string, actorId?: number | null) {
  const uid = normalizeUid(uidRaw);
  if (!uid) return { error: "RFID UID format is invalid.", status: 400 };
  const student = await findStudent(studentRef);
  if (!student) return { error: "Student not found", status: 404 };
  const [taken] = await db
    .select()
    .from(rfidCards)
    .where(and(eq(rfidCards.uid, uid), student.id ? ne(rfidCards.studentId, student.id) : eq(rfidCards.uid, uid)))
    .limit(1);
  if (taken && taken.studentId && taken.studentId !== student.id) {
    return { error: "This RFID card is already registered to another student.", status: 409 };
  }
  if (student.rfidUid && student.rfidUid !== uid) {
    await db.update(rfidCards).set({ studentId: null, status: "UNASSIGNED" }).where(eq(rfidCards.uid, student.rfidUid));
  }
  const [otherOwner] = await db.select().from(students).where(and(eq(students.rfidUid, uid), ne(students.id, student.id))).limit(1);
  if (otherOwner) return { error: "This RFID card is already registered to another student.", status: 409 };

  const [existingCard] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
  if (existingCard) {
    await db.update(rfidCards).set({ studentId: student.id, status: "ASSIGNED" }).where(eq(rfidCards.id, existingCard.id));
  } else {
    await db.insert(rfidCards).values({ uid, studentId: student.id, status: "ASSIGNED" });
  }
  await db.update(students).set({ rfidUid: uid }).where(eq(students.id, student.id));
  const [account] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);
  if (account) await notifyUser(account.id, "RFID card registered successfully.", `Card ${uid} is now linked to ${student.studentCode}.`, "success");
  if (actorId) {
    await db.insert(attendanceLogs).values({
      action: "RFID_ASSIGN",
      performedBy: actorId,
      newValue: { studentId: student.studentCode, rfidUID: uid },
    });
  }
  return { uid, student };
}

export async function findStudent(ref: number | string) {
  if (typeof ref === "number" || /^\d+$/.test(String(ref))) {
    const asNumber = Number(ref);
    const [byId] = await db.select().from(students).where(eq(students.id, asNumber)).limit(1);
    if (byId) return byId;
  }
  const code = String(ref).trim();
  const [byCode] = await db.select().from(students).where(eq(students.studentCode, code)).limit(1);
  return byCode ?? null;
}

export async function unassignCard(uidRaw: string) {
  const uid = normalizeUid(uidRaw);
  if (!uid) return { error: "RFID UID format is invalid.", status: 400 };
  const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
  if (!card) return { error: "RFID card is not registered", status: 404 };
  if (card.studentId) {
    await db.update(students).set({ rfidUid: null }).where(and(eq(students.id, card.studentId), eq(students.rfidUid, uid)));
  }
  await db.update(rfidCards).set({ studentId: null, status: "UNASSIGNED" }).where(eq(rfidCards.id, card.id));
  return { uid };
}

export async function removeCard(uidRaw: string) {
  const uid = normalizeUid(uidRaw);
  if (!uid) return { error: "RFID UID format is invalid.", status: 400 };
  const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
  if (!card) return { error: "RFID card is not registered", status: 404 };
  if (card.studentId) {
    await db.update(students).set({ rfidUid: null }).where(eq(students.id, card.studentId));
  }
  await db.delete(rfidCards).where(eq(rfidCards.id, card.id));
  return { uid };
}

export async function latestScans(limit = 12) {
  const rows = await db
    .select({
      id: rfidScans.id,
      rfidUid: rfidScans.rfidUid,
      deviceId: rfidScans.deviceId,
      success: rfidScans.success,
      message: rfidScans.message,
      scanType: rfidScans.scanType,
      status: rfidScans.status,
      createdAt: rfidScans.createdAt,
      studentName: students.name,
      studentCode: students.studentCode,
    })
    .from(rfidScans)
    .leftJoin(students, eq(rfidScans.studentId, students.id))
    .orderBy(desc(rfidScans.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    time: formatTime(row.createdAt),
    createdAt: row.createdAt,
  }));
}

export function entryFromParts(date: string, time?: string | null) {
  if (!time) return null;
  return kolkataDateTime(date, time);
}
