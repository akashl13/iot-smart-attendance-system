import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendance,
  attendanceLogs,
  courses,
  departments,
  devices,
  notifications,
  rfidCards,
  rfidScans,
  sections,
  semesters,
  students,
  subjects,
  teachers,
  users,
} from "@/db/schema";
import { TOKEN_COOKIE } from "@/lib/constants";
import { clearAuthCookie, hashPassword, setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { attendanceScore, formatDateTime, formatTime, normalizeUid, randomUid, todayKolkata } from "@/lib/format";
import {
  attendanceWriteSchema,
  courseSchema,
  departmentSchema,
  deviceSchema,
  heartbeatSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  rfidRegisterSchema,
  rfidUpdateSchema,
  scanSchema,
  sectionSchema,
  semesterSchema,
  settingsSchema,
  studentWriteSchema,
  subjectSchema,
  teacherSchema,
  zodMessage,
} from "@/lib/validators";
import { adminAnalytics, refreshDevicePresence, studentAnalytics } from "@/server/analytics";
import { assertDeviceKey, clientIp, fail, handleError, ok, pageParams, parseId, rateLimit, readBody, requireUser } from "@/server/http";
import { buildReport } from "@/server/reports";
import { assignCard, entryFromParts, findStudent, latestScans, processRfidScan, removeCard, touchDevice, unassignCard } from "@/server/rfid";
import { ensureSeed } from "@/server/seed";
import { makeCrudHandlers } from "@/server/crud";
import { getSettings, saveSettings } from "@/server/settings";
import { createStudentAccount, deleteStudentAccount, updateStudentAccount } from "@/server/students";

function searchTerm(value: string | null) {
  if (!value?.trim()) return null;
  return `%${value.trim().replace(/[\\%_]/g, "")}%`;
}

/** Groups attendance rows by student id, bucketing into a mutable array per student. */
async function studentDto(ids: number[]) {
  if (!ids.length) return new Map<number, { status: string }[]>();
  const stats = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(inArray(attendance.studentId, ids));
  const grouped = new Map<number, { status: string }[]>();
  for (const row of stats) {
    const bucket = grouped.get(row.studentId);
    if (bucket) bucket.push(row);
    else grouped.set(row.studentId, [row]);
  }
  return grouped;
}

/**
 * Resolves the student behind an RFID UID. Prefers the card's linked student id and
 * falls back to matching students.rfidUid directly, so both lookup paths share one query shape.
 */
async function fetchStudentByIdOrUid(uid: string, cardStudentId?: number | null) {
  const columns = {
    id: students.id,
    studentCode: students.studentCode,
    name: students.name,
    email: students.email,
    phone: students.phone,
    departmentId: students.departmentId,
    department: departments.name,
    departmentCode: departments.code,
    courseId: students.courseId,
    course: courses.name,
    semester: students.semester,
    section: students.section,
    status: students.status,
    rfidUid: students.rfidUid,
  };
  const query = db
    .select(columns)
    .from(students)
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(courses, eq(students.courseId, courses.id))
    .where(cardStudentId ? eq(students.id, cardStudentId) : eq(students.rfidUid, uid))
    .limit(1);
  const [row] = await query;
  return row ?? null;
}

export async function registerHandler(req: Request) {
  try {
    await ensureSeed();
    const parsed = registerSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const limited = rateLimit(`register:${clientIp(req)}`, 8, 10 * 60_000);
    if (!limited.ok) return fail("Too many registration attempts. Please wait and try again.", 429);
    const created = await createStudentAccount({ ...parsed.data, studentId: parsed.data.studentId, rfidUID: parsed.data.rfidUID });
    if ("error" in created) return fail(created.error, created.status);
    return ok({ message: "Registration completed. You can now sign in.", studentId: created.student.studentCode });
  } catch (error) {
    return handleError(error);
  }
}

export async function loginHandler(req: Request) {
  try {
    await ensureSeed();
    const parsed = loginSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const limited = rateLimit(`login:${clientIp(req)}`, 12, 10 * 60_000);
    if (!limited.ok) return fail("Too many login attempts. Please wait and try again.", 429);
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return fail("Invalid login credentials.", 401);
    if (parsed.data.portal === "admin" && user.role !== "ADMIN") return fail("This portal is for administrators.", 403);
    if (parsed.data.portal === "student" && user.role !== "STUDENT") return fail("This portal is for students.", 403);
    const token = signToken(user);
    await setAuthCookie(token);
    const response = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.headers.append("Set-Cookie", `${TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function logoutHandler() {
  await clearAuthCookie();
  const response = ok({ message: "Signed out." });
  response.headers.append("Set-Cookie", `${TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}

export async function meHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const settings = await getSettings();
    return ok({
      user: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.role,
        student: auth.user.student
          ? {
              id: auth.user.student.id,
              studentId: auth.user.student.studentCode,
              rfidUid: auth.user.student.rfidUid,
              rfidStatus: auth.user.student.rfidUid ? "CONNECTED" : "NOT REGISTERED",
              departmentId: auth.user.student.departmentId,
              semester: auth.user.student.semester,
              section: auth.user.student.section,
            }
          : null,
      },
      institution: settings.institutionName,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function passwordHandler(req: Request) {
  try {
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const parsed = passwordSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) return fail("Current password is incorrect.", 400);
    await db.update(users).set({ passwordHash: await hashPassword(parsed.data.newPassword) }).where(eq(users.id, user.id));
    return ok({ message: "Password updated." });
  } catch (error) {
    return handleError(error);
  }
}

export async function listStudentsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const { page, limit, offset } = pageParams(url, 8);
    const filters = [];
    const q = searchTerm(url.searchParams.get("search"));
    if (q) filters.push(or(ilike(students.name, q), ilike(students.studentCode, q), ilike(students.email, q), ilike(students.rfidUid, q), ilike(students.enrollmentNumber, q)));
    const departmentId = Number(url.searchParams.get("departmentId") || 0);
    const courseId = Number(url.searchParams.get("courseId") || 0);
    const semester = Number(url.searchParams.get("semester") || 0);
    const status = url.searchParams.get("status");
    if (departmentId) filters.push(eq(students.departmentId, departmentId));
    if (courseId) filters.push(eq(students.courseId, courseId));
    if (semester) filters.push(eq(students.semester, semester));
    if (status) filters.push(eq(students.status, status));
    const where = filters.length ? and(...filters) : undefined;
    const [{ value }] = await db.select({ value: count() }).from(students).where(where);
    const rows = await db
      .select({
        id: students.id,
        studentCode: students.studentCode,
        name: students.name,
        email: students.email,
        phone: students.phone,
        dateOfBirth: students.dateOfBirth,
        gender: students.gender,
        departmentId: students.departmentId,
        department: departments.name,
        departmentCode: departments.code,
        courseId: students.courseId,
        course: courses.name,
        semester: students.semester,
        section: students.section,
        enrollmentNumber: students.enrollmentNumber,
        rfidUid: students.rfidUid,
        status: students.status,
        createdAt: students.createdAt,
      })
      .from(students)
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id))
      .where(where)
      .orderBy(asc(students.name))
      .limit(limit)
      .offset(offset);
    const grouped = await studentDto(rows.map((row) => row.id));
    return ok({
      data: rows.map((row) => ({
        ...row,
        studentId: row.studentCode,
        rfid: row.rfidUid,
        rfidStatus: row.rfidUid ? "CONNECTED" : "NOT REGISTERED",
        attendance: attendanceScore(grouped.get(row.id) ?? []).percentage,
      })),
      total: Number(value),
      page,
      limit,
      pages: Math.max(1, Math.ceil(Number(value) / limit)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function createStudentHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = studentWriteSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const created = await createStudentAccount({ ...parsed.data, rfidUID: parsed.data.rfidUID || null, password: parsed.data.password || "Student@123" });
    if ("error" in created) return fail(created.error, created.status);
    return ok({ message: "Student added.", id: created.student.id, studentId: created.student.studentCode });
  } catch (error) {
    return handleError(error);
  }
}

export async function getStudentHandler(req: Request, id: string) {
  try {
    await ensureSeed();
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const student = await findStudent(/^\d+$/.test(id) ? Number(id) : id);
    if (!student) return fail("Student not found", 404);
    if (auth.user.role === "STUDENT" && auth.user.student?.id !== student.id) return fail("You do not have permission to perform this action.", 403);
    const [profile] = await db
      .select({
        id: students.id,
        studentCode: students.studentCode,
        name: students.name,
        email: students.email,
        phone: students.phone,
        dateOfBirth: students.dateOfBirth,
        gender: students.gender,
        departmentId: students.departmentId,
        department: departments.name,
        departmentCode: departments.code,
        courseId: students.courseId,
        course: courses.name,
        semester: students.semester,
        section: students.section,
        enrollmentNumber: students.enrollmentNumber,
        rfidUid: students.rfidUid,
        status: students.status,
        createdAt: students.createdAt,
      })
      .from(students)
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id))
      .where(eq(students.id, student.id))
      .limit(1);
    if (!profile) return fail("Student profile is incomplete.", 404);
    const recent = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        entryTime: attendance.entryTime,
        exitTime: attendance.exitTime,
        deviceId: attendance.deviceId,
        subject: subjects.subjectName,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(eq(attendance.studentId, student.id))
      .orderBy(desc(attendance.date))
      .limit(8);
    const grouped = await studentDto([student.id]);
    return ok({
      student: {
        ...profile,
        studentId: profile.studentCode,
        rfidStatus: profile.rfidUid ? "CONNECTED" : "NOT REGISTERED",
        attendance: attendanceScore(grouped.get(student.id) ?? []).percentage,
        recent: recent.map((row) => ({ ...row, entryTime: formatTime(row.entryTime), exitTime: formatTime(row.exitTime) })),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateStudentHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = studentWriteSchema.partial().safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const studentId = parseId(id);
    if (studentId instanceof Response) return studentId;
    const updated = await updateStudentAccount(studentId, parsed.data);
    if ("error" in updated) return fail(updated.error, updated.status);
    return ok({ message: "Student updated.", student: updated.student });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteStudentHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const studentId = parseId(id);
    if (studentId instanceof Response) return studentId;
    const removed = await deleteStudentAccount(studentId);
    if ("error" in removed) return fail(removed.error, removed.status);
    return ok({ message: "Student deleted." });
  } catch (error) {
    return handleError(error);
  }
}

export async function scanHandler(req: Request) {
  try {
    await ensureSeed();
    const limited = rateLimit(`rfid:${clientIp(req)}`, 40, 60_000);
    if (!limited.ok) return fail("RFID endpoint rate limit reached. Try again shortly.", 429);
    const denied = assertDeviceKey(req);
    if (denied) return denied;
    const parsed = scanSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const result = await processRfidScan({
      rfidUID: parsed.data.rfidUID,
      deviceId: parsed.data.deviceId,
      scanDirection: parsed.data.scanDirection,
      deviceTimestamp: parsed.data.deviceTimestamp ?? null,
      firmwareVersion: parsed.data.firmwareVersion ?? null,
      ipAddress: clientIp(req),
    });
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    return handleError(error);
  }
}

export async function registerRfidHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = rfidRegisterSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const assigned = await assignCard(parsed.data.rfidUID, parsed.data.studentId, auth.user.id);
    if ("error" in assigned) return fail(assigned.error, assigned.status);
    return ok({ message: "RFID card registered successfully.", rfidUID: assigned.uid, studentId: assigned.student.studentCode });
  } catch (error) {
    return handleError(error);
  }
}

export async function listRfidHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const { page, limit, offset } = pageParams(url, 8);
    const filters = [];
    const q = searchTerm(url.searchParams.get("search"));
    const status = url.searchParams.get("status");
    if (q) filters.push(or(ilike(rfidCards.uid, q), ilike(students.name, q), ilike(students.studentCode, q)));
    if (status) filters.push(eq(rfidCards.status, status));
    const where = filters.length ? and(...filters) : undefined;
    const [{ value }] = await db.select({ value: count() }).from(rfidCards).leftJoin(students, eq(rfidCards.studentId, students.id)).where(where);
    const rows = await db
      .select({
        id: rfidCards.id,
        uid: rfidCards.uid,
        status: rfidCards.status,
        registeredAt: rfidCards.registeredAt,
        lastScan: rfidCards.lastScan,
        studentDbId: students.id,
        studentName: students.name,
        studentId: students.studentCode,
      })
      .from(rfidCards)
      .leftJoin(students, eq(rfidCards.studentId, students.id))
      .where(where)
      .orderBy(desc(rfidCards.registeredAt))
      .limit(limit)
      .offset(offset);
    const scans = await db.select({ deviceId: rfidScans.deviceId, rfidUid: rfidScans.rfidUid, createdAt: rfidScans.createdAt }).from(rfidScans).orderBy(desc(rfidScans.createdAt)).limit(200);
    return ok({
      data: rows.map((row) => ({
        ...row,
        registeredAt: formatDateTime(row.registeredAt),
        lastScan: formatDateTime(row.lastScan),
        device: scans.find((scan) => scan.rfidUid === row.uid)?.deviceId || "—",
      })),
      total: Number(value),
      page,
      pages: Math.max(1, Math.ceil(Number(value) / limit)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getRfidHandler(req: Request, uidParam: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const uid = normalizeUid(decodeURIComponent(uidParam));
    if (!uid) return fail("RFID UID format is invalid.");
    const [card] = await db
      .select({
        id: rfidCards.id,
        uid: rfidCards.uid,
        status: rfidCards.status,
        registeredAt: rfidCards.registeredAt,
        lastScan: rfidCards.lastScan,
        studentName: students.name,
        studentId: students.studentCode,
      })
      .from(rfidCards)
      .leftJoin(students, eq(rfidCards.studentId, students.id))
      .where(eq(rfidCards.uid, uid))
      .limit(1);
    if (!card) return fail("RFID card is not registered", 404);
    const history = await db.select().from(rfidScans).where(eq(rfidScans.rfidUid, uid)).orderBy(desc(rfidScans.createdAt)).limit(30);
    return ok({
      card: { ...card, registeredAt: formatDateTime(card.registeredAt), lastScan: formatDateTime(card.lastScan) },
      history: history.map((row) => ({ ...row, time: formatTime(row.createdAt), createdAt: formatDateTime(row.createdAt) })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateRfidHandler(req: Request, uidParam: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const uid = normalizeUid(decodeURIComponent(uidParam));
    if (!uid) return fail("RFID UID format is invalid.");
    const parsed = rfidUpdateSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
    if (!card) return fail("RFID card is not registered", 404);
    if (parsed.data.studentId === null || parsed.data.status === "UNASSIGNED") {
      const cleared = await unassignCard(uid);
      if ("error" in cleared) return fail(cleared.error, cleared.status);
    } else if (parsed.data.studentId) {
      const assigned = await assignCard(uid, parsed.data.studentId, auth.user.id);
      if ("error" in assigned) return fail(assigned.error, assigned.status);
    }
    if (parsed.data.status) {
      await db.update(rfidCards).set({ status: parsed.data.status === "UNASSIGNED" ? "UNASSIGNED" : parsed.data.status }).where(eq(rfidCards.uid, uid));
      if (parsed.data.status === "BLOCKED") {
        await db.update(students).set({ rfidUid: null }).where(eq(students.rfidUid, uid));
      }
    }
    return ok({ message: "RFID card updated.", rfidUID: uid });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteRfidHandler(req: Request, uidParam: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const removed = await removeCard(decodeURIComponent(uidParam));
    if ("error" in removed) return fail(removed.error, removed.status);
    return ok({ message: "RFID card removed." });
  } catch (error) {
    return handleError(error);
  }
}

export async function checkRfidHandler(req: Request) {
  try {
    await ensureSeed();
    const limited = rateLimit(`rfid-check:${clientIp(req)}`, 30, 60_000);
    if (!limited.ok) return fail("Too many RFID checks. Please wait.", 429);
    const uid = normalizeUid(new URL(req.url).searchParams.get("uid") || "");
    if (!uid) return fail("RFID UID format is invalid.");
    const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
    const [student] = await db.select().from(students).where(eq(students.rfidUid, uid)).limit(1);
    const available = !card?.studentId && !student;
    return ok({ available, rfidUID: uid, message: available ? "RFID card is available." : "This RFID card is already registered." });
  } catch (error) {
    return handleError(error);
  }
}

export async function lookupRfidHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const rawUid = url.searchParams.get("uid") || (req.method === "POST" ? ((await readBody(req)) as { uid?: string })?.uid : "");
    const uid = normalizeUid(rawUid || "");
    if (!uid) return fail("RFID UID format is invalid.");

    // Look for registered card
    const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);

    // Look for student via the card link, falling back to a direct UID match.
    const studentRecord = await fetchStudentByIdOrUid(uid, card?.studentId);

    const scans = await db
      .select()
      .from(rfidScans)
      .where(eq(rfidScans.rfidUid, uid))
      .orderBy(desc(rfidScans.createdAt))
      .limit(5);

    if (!studentRecord) {
      return ok({
        found: false,
        registered: false,
        uid,
        message: "No student is currently assigned to this RFID card.",
        card: card ? { uid: card.uid, status: card.status, registeredAt: formatDateTime(card.registeredAt) } : null,
        recentScans: scans.map((s) => ({ ...s, time: formatTime(s.createdAt) })),
      });
    }

    const today = todayKolkata();
    const [todayAtt] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, studentRecord.id), eq(attendance.date, today)))
      .limit(1);

    const grouped = await studentDto([studentRecord.id]);
    const score = attendanceScore(grouped.get(studentRecord.id) ?? []);

    return ok({
      found: true,
      registered: true,
      uid,
      student: {
        ...studentRecord,
        attendancePercentage: score.percentage,
        todayStatus: todayAtt?.status || "Unmarked",
        entryTime: formatTime(todayAtt?.entryTime) || "—",
        exitTime: formatTime(todayAtt?.exitTime) || "—",
      },
      card: card ? { uid: card.uid, status: card.status, registeredAt: formatDateTime(card.registeredAt) } : { uid, status: "ASSIGNED" },
      recentScans: scans.map((s) => ({ ...s, time: formatTime(s.createdAt) })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function nextUidHandler(req: Request) {
  try {
    await ensureSeed();
    const limited = rateLimit(`rfid-next:${clientIp(req)}`, 20, 60_000);
    if (!limited.ok) return fail("Please wait before generating another card.", 429);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const uid = randomUid();
      const [card] = await db.select().from(rfidCards).where(eq(rfidCards.uid, uid)).limit(1);
      const [student] = await db.select().from(students).where(eq(students.rfidUid, uid)).limit(1);
      if (!card && !student) return ok({ rfidUID: uid });
    }
    return fail("Could not generate a unique RFID UID. Try again.", 500);
  } catch (error) {
    return handleError(error);
  }
}

function attendanceFilters(url: URL, studentDbId?: number) {
  const filters = [];
  if (studentDbId) filters.push(eq(attendance.studentId, studentDbId));
  const date = url.searchParams.get("date");
  const month = url.searchParams.get("month");
  const status = url.searchParams.get("status");
  const departmentId = Number(url.searchParams.get("departmentId") || 0);
  const courseId = Number(url.searchParams.get("courseId") || 0);
  const subjectId = Number(url.searchParams.get("subjectId") || 0);
  const studentParam = url.searchParams.get("studentId");
  if (date) filters.push(eq(attendance.date, date));
  if (month && /^\d{4}-\d{2}$/.test(month)) filters.push(sql`${attendance.date}::text like ${`${month}-%`}`);
  if (status) filters.push(eq(attendance.status, status));
  if (departmentId) filters.push(eq(students.departmentId, departmentId));
  if (courseId) filters.push(eq(students.courseId, courseId));
  if (subjectId) filters.push(eq(attendance.subjectId, subjectId));
  if (studentParam && !studentDbId) {
    if (/^\d+$/.test(studentParam) && studentParam.length < 7) filters.push(eq(students.id, Number(studentParam)));
    else filters.push(eq(students.studentCode, studentParam.toUpperCase()));
  }
  const q = searchTerm(url.searchParams.get("search"));
  if (q) filters.push(or(ilike(students.name, q), ilike(students.studentCode, q), ilike(subjects.subjectName, q), ilike(attendance.deviceId, q)));
  return filters.length ? and(...filters) : undefined;
}

const attendanceSelect = {
  id: attendance.id,
  date: attendance.date,
  status: attendance.status,
  entryTime: attendance.entryTime,
  exitTime: attendance.exitTime,
  deviceId: attendance.deviceId,
  rfidUid: attendance.rfidUid,
  scanType: attendance.scanType,
  studentDbId: students.id,
  studentId: students.studentCode,
  studentName: students.name,
  department: departments.name,
  departmentCode: departments.code,
  course: courses.name,
  semester: students.semester,
  subjectId: attendance.subjectId,
  subject: subjects.subjectName,
  teacher: teachers.name,
};

export async function listAttendanceHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const { page, limit, offset } = pageParams(url, 10);
    const scope = auth.user.role === "STUDENT" ? auth.user.student?.id : undefined;
    if (auth.user.role === "STUDENT" && !scope) return fail("Student profile not found.", 404);
    const where = attendanceFilters(url, scope);
    const [{ value }] = await db
      .select({ value: count() })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(where);
    const rows = await db
      .select(attendanceSelect)
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .leftJoin(teachers, eq(attendance.teacherId, teachers.id))
      .where(where)
      .orderBy(desc(attendance.date), desc(attendance.entryTime))
      .limit(limit)
      .offset(offset);
    return ok({
      data: rows.map((row) => ({ ...row, entry: formatTime(row.entryTime) || "—", exit: formatTime(row.exitTime) || "—", subject: row.subject || "—", teacher: row.teacher || "—" })),
      total: Number(value),
      page,
      pages: Math.max(1, Math.ceil(Number(value) / limit)),
    });
  } catch (error) {
    return handleError(error);
  }
}

async function writeAttendance(input: {
  studentRef: number | string;
  date: string;
  status: string;
  entryTime?: string | null;
  exitTime?: string | null;
  subjectId?: number | null;
  deviceId?: string | null;
  rfidUID?: string | null;
  actorId: number;
  existingId?: number;
}) {
  const student = await findStudent(input.studentRef);
  if (!student) return { error: "Student not found", status: 404 };
  const [subject] = input.subjectId ? await db.select().from(subjects).where(eq(subjects.id, input.subjectId)).limit(1) : [null];
  const values = {
    studentId: student.id,
    date: input.date,
    status: input.status,
    entryTime: entryFromParts(input.date, input.entryTime),
    exitTime: entryFromParts(input.date, input.exitTime),
    subjectId: subject?.id ?? null,
    teacherId: subject?.teacherId ?? null,
    deviceId: input.deviceId || null,
    rfidUid: input.rfidUID ? normalizeUid(input.rfidUID) || student.rfidUid : student.rfidUid,
    scanType: input.exitTime ? "EXIT" : input.entryTime ? "ENTRY" : null,
    updatedAt: new Date(),
  };
  if (input.existingId) {
    const [existing] = await db.select().from(attendance).where(eq(attendance.id, input.existingId)).limit(1);
    if (!existing) return { error: "Attendance record not found.", status: 404 };
    const [updated] = await db.update(attendance).set(values).where(eq(attendance.id, input.existingId)).returning();
    await db.insert(attendanceLogs).values({
      attendanceId: updated.id,
      action: "CORRECT",
      performedBy: input.actorId,
      oldValue: { status: existing.status, date: existing.date, entryTime: existing.entryTime, exitTime: existing.exitTime, deviceId: existing.deviceId },
      newValue: { status: updated.status, date: updated.date, entryTime: updated.entryTime, exitTime: updated.exitTime, deviceId: updated.deviceId },
    });
    return { record: updated };
  }
  const [created] = await db.insert(attendance).values(values).returning();
  await db.insert(attendanceLogs).values({
    attendanceId: created.id,
    action: "CREATE",
    performedBy: input.actorId,
    newValue: { status: created.status, date: created.date },
  });
  return { record: created };
}

export async function createAttendanceHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = attendanceWriteSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const result = await writeAttendance({ ...parsed.data, studentRef: parsed.data.studentId, actorId: auth.user.id });
    if ("error" in result) return fail(result.error, result.status);
    return ok({ message: "Attendance record created.", id: result.record.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function getAttendanceHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const recordId = parseId(id);
    if (recordId instanceof Response) return recordId;
    const [row] = await db
      .select(attendanceSelect)
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .leftJoin(teachers, eq(attendance.teacherId, teachers.id))
      .where(eq(attendance.id, recordId))
      .limit(1);
    if (!row) return fail("Attendance record not found.", 404);
    if (auth.user.role === "STUDENT" && auth.user.student?.id !== row.studentDbId) return fail("You do not have permission to perform this action.", 403);
    const logs = await db
      .select({
        id: attendanceLogs.id,
        action: attendanceLogs.action,
        oldValue: attendanceLogs.oldValue,
        newValue: attendanceLogs.newValue,
        timestamp: attendanceLogs.timestamp,
        performedBy: users.name,
      })
      .from(attendanceLogs)
      .leftJoin(users, eq(attendanceLogs.performedBy, users.id))
      .where(eq(attendanceLogs.attendanceId, row.id))
      .orderBy(desc(attendanceLogs.timestamp));
    return ok({
      attendance: { ...row, entry: formatTime(row.entryTime) || "—", exit: formatTime(row.exitTime) || "—" },
      logs: logs.map((log) => ({ ...log, timestamp: formatDateTime(log.timestamp) })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAttendanceHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = attendanceWriteSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const attendanceId = parseId(id);
    if (attendanceId instanceof Response) return attendanceId;
    const result = await writeAttendance({ ...parsed.data, studentRef: parsed.data.studentId, actorId: auth.user.id, existingId: attendanceId });
    if ("error" in result) return fail(result.error, result.status);
    return ok({ message: "Attendance updated." });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteAttendanceHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const attendanceId = parseId(id);
    if (attendanceId instanceof Response) return attendanceId;
    const [existing] = await db.select().from(attendance).where(eq(attendance.id, attendanceId)).limit(1);
    if (!existing) return fail("Attendance record not found.", 404);
    await db.insert(attendanceLogs).values({
      attendanceId: existing.id,
      action: "DELETE",
      performedBy: auth.user.id,
      oldValue: { status: existing.status, date: existing.date, studentId: existing.studentId },
    });
    await db.delete(attendance).where(eq(attendance.id, existing.id));
    return ok({ message: "Attendance record deleted." });
  } catch (error) {
    return handleError(error);
  }
}

export async function markAbsentHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const body = await readBody<{ date?: string; departmentId?: number }>(req);
    const date = body.date || todayKolkata();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("A valid date is required.");
    const filters = [eq(students.status, "ACTIVE")];
    if (body.departmentId) filters.push(eq(students.departmentId, Number(body.departmentId)));
    const roster = await db.select().from(students).where(and(...filters));
    const existing = await db.select({ studentId: attendance.studentId }).from(attendance).where(eq(attendance.date, date));
    const marked = new Set(existing.map((row) => row.studentId));
    const missing = roster.filter((student) => !marked.has(student.id));
    if (missing.length) {
      const created = await db
        .insert(attendance)
        .values(missing.map((student) => ({ studentId: student.id, rfidUid: student.rfidUid, date, status: "Absent", scanType: null, deviceId: null })))
        .returning();
      await db.insert(attendanceLogs).values(created.map((row) => ({ attendanceId: row.id, action: "MARK_ABSENT", performedBy: auth.user.id, newValue: { status: "Absent", date } })));
    }
    return ok({ message: `${missing.length} absent record${missing.length === 1 ? "" : "s"} created.`, count: missing.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function listSubjectsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const rows = await db
      .select({
        id: subjects.id,
        subjectCode: subjects.subjectCode,
        subjectName: subjects.subjectName,
        departmentId: subjects.departmentId,
        department: departments.name,
        semester: subjects.semester,
        teacherId: subjects.teacherId,
        teacher: teachers.name,
      })
      .from(subjects)
      .innerJoin(departments, eq(subjects.departmentId, departments.id))
      .leftJoin(teachers, eq(subjects.teacherId, teachers.id))
      .orderBy(asc(subjects.subjectCode));
    return ok({ data: rows });
  } catch (error) {
    return handleError(error);
  }
}

const subjectCrud = makeCrudHandlers({
  table: subjects,
  schema: subjectSchema,
  mapValues: (data: any) => ({ ...data, subjectCode: data.subjectCode.toUpperCase(), teacherId: data.teacherId || null }),
  messages: { created: "Subject added.", updated: "Subject updated.", deleted: "Subject deleted.", notFound: "Subject not found." },
  key: "subject",
});

export const createSubjectHandler = subjectCrud.create;
export const updateSubjectHandler = subjectCrud.update!;
export const deleteSubjectHandler = subjectCrud.remove;

export async function listTeachersHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const rows = await db
      .select({
        id: teachers.id,
        teacherId: teachers.teacherCode,
        name: teachers.name,
        email: teachers.email,
        departmentId: teachers.departmentId,
        department: departments.name,
        departmentCode: departments.code,
      })
      .from(teachers)
      .innerJoin(departments, eq(teachers.departmentId, departments.id))
      .orderBy(asc(teachers.name));
    const subjectRows = await db.select().from(subjects);
    return ok({
      data: rows.map((row) => ({
        ...row,
        subjects: subjectRows.filter((subject) => subject.teacherId === row.id).map((subject) => subject.subjectName),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

const teacherCrud = makeCrudHandlers({
  table: teachers,
  schema: teacherSchema,
  mapValues: (data: any) => ({
    teacherCode: data.teacherId.toUpperCase(),
    name: data.name,
    email: data.email.toLowerCase(),
    departmentId: data.departmentId,
  }),
  messages: { created: "Teacher added.", updated: "Teacher updated.", deleted: "Teacher deleted.", notFound: "Teacher not found." },
  key: "teacher",
});

export const createTeacherHandler = teacherCrud.create;
export const updateTeacherHandler = teacherCrud.update!;
export const deleteTeacherHandler = teacherCrud.remove;

export async function metaHandler() {
  try {
    await ensureSeed();
    const [departmentRows, courseRows, semesterRows, sectionRows] = await Promise.all([
      db.select().from(departments).orderBy(asc(departments.code)),
      db.select().from(courses).orderBy(asc(courses.name)),
      db.select().from(semesters).orderBy(asc(semesters.number)),
      db.select().from(sections).orderBy(asc(sections.name)),
    ]);
    return ok({ departments: departmentRows, courses: courseRows, semesters: semesterRows, sections: sectionRows });
  } catch (error) {
    return handleError(error);
  }
}

export async function listDepartmentsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const departmentRows = await db.select().from(departments).orderBy(asc(departments.name));
    const courseRows = await db.select().from(courses).orderBy(asc(courses.name));
    const semesterRows = await db.select().from(semesters).orderBy(asc(semesters.number));
    const sectionRows = await db.select().from(sections).orderBy(asc(sections.name));
    return ok({ departments: departmentRows, courses: courseRows, semesters: semesterRows, sections: sectionRows });
  } catch (error) {
    return handleError(error);
  }
}

const departmentCrud = makeCrudHandlers({
  table: departments,
  schema: departmentSchema,
  mapValues: (data: any) => ({ name: data.name, code: data.code.toUpperCase() }),
  messages: {
    created: "Department created.",
    updated: "Department updated.",
    deleted: "Department deleted.",
    notFound: "Department not found.",
  },
  key: "department",
});

export const createDepartmentHandler = departmentCrud.create;
export const updateDepartmentHandler = departmentCrud.update!;
export const deleteDepartmentHandler = departmentCrud.remove;

const courseCrud = makeCrudHandlers({
  table: courses,
  schema: courseSchema,
  mapValues: (data: any) => ({ ...data, code: data.code.toUpperCase() }),
  messages: { created: "Course created.", updated: "Course updated.", deleted: "Course deleted.", notFound: "Course not found." },
  key: "course",
});

export const createCourseHandler = courseCrud.create;
export const updateCourseHandler = courseCrud.update!;
export const deleteCourseHandler = courseCrud.remove;

const semesterCrud = makeCrudHandlers({
  table: semesters,
  schema: semesterSchema,
  mapValues: (data: any) => ({ courseId: data.courseId, number: data.number, name: data.name || `Semester ${data.number}` }),
  messages: {
    created: "Semester created.",
    updated: "Semester updated.",
    deleted: "Semester deleted.",
    notFound: "Semester not found.",
  },
  key: "semester",
  skipUpdate: true,
});

export const createSemesterHandler = semesterCrud.create;
export const deleteSemesterHandler = semesterCrud.remove;

const sectionCrud = makeCrudHandlers({
  table: sections,
  schema: sectionSchema,
  mapValues: (data: any) => ({ ...data, name: data.name.toUpperCase() }),
  messages: {
    created: "Section created.",
    updated: "Section updated.",
    deleted: "Section deleted.",
    notFound: "Section not found.",
  },
  key: "section",
  skipUpdate: true,
});

export const createSectionHandler = sectionCrud.create;
export const deleteSectionHandler = sectionCrud.remove;

export async function listDevicesHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const data = await refreshDevicePresence();
    return ok({
      data: data.map((device) => ({
        ...device,
        deviceId: device.deviceCode,
        lastSeenLabel: formatDateTime(device.lastSeen),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function createDeviceHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = deviceSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const [row] = await db
      .insert(devices)
      .values({
        deviceCode: parsed.data.deviceId.toUpperCase(),
        name: parsed.data.name,
        location: parsed.data.location,
        ipAddress: parsed.data.ipAddress || null,
        firmwareVersion: parsed.data.firmwareVersion || null,
        status: parsed.data.status || "OFFLINE",
        trustState: parsed.data.trustState || "PENDING",
      })
      .returning();
    return ok({ message: "Device registered.", device: row });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateDeviceHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = deviceSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const deviceId = parseId(id);
    if (deviceId instanceof Response) return deviceId;
    const [row] = await db
      .update(devices)
      .set({
        deviceCode: parsed.data.deviceId.toUpperCase(),
        name: parsed.data.name,
        location: parsed.data.location,
        ipAddress: parsed.data.ipAddress || null,
        firmwareVersion: parsed.data.firmwareVersion || null,
        status: parsed.data.status || "OFFLINE",
        trustState: parsed.data.trustState || "PENDING",
      })
      .where(eq(devices.id, deviceId))
      .returning();
    if (!row) return fail("Device not found.", 404);
    return ok({ message: "Device updated." });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteDeviceHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const deviceId = parseId(id);
    if (deviceId instanceof Response) return deviceId;
    const [row] = await db.delete(devices).where(eq(devices.id, deviceId)).returning();
    if (!row) return fail("Device not found.", 404);
    return ok({ message: "Device removed." });
  } catch (error) {
    return handleError(error);
  }
}

export async function heartbeatHandler(req: Request) {
  try {
    await ensureSeed();
    const limited = rateLimit(`heartbeat:${clientIp(req)}`, 60, 60_000);
    if (!limited.ok) return fail("Heartbeat rate limit reached.", 429);
    const denied = assertDeviceKey(req);
    if (denied) return denied;
    const parsed = heartbeatSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const heartbeat = await touchDevice(parsed.data.deviceId, parsed.data.ipAddress || clientIp(req));
    if (!heartbeat.known) {
      return fail("Reader is not registered with the server. Ask an administrator to provision it.", 403);
    }
    if (parsed.data.firmwareVersion) {
      await db.update(devices).set({ firmwareVersion: parsed.data.firmwareVersion }).where(eq(devices.deviceCode, parsed.data.deviceId));
    }
    const [device] = await db.select().from(devices).where(eq(devices.deviceCode, parsed.data.deviceId)).limit(1);
    return ok({
      message: "Heartbeat received.",
      device: {
        deviceId: device.deviceCode,
        status: device.status,
        lastSeen: device.lastSeen,
        trustState: device.trustState,
        scanDirection: device.scanDirection,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function dailyReportHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const report = await buildReport("Daily Attendance Report", {
      date: url.searchParams.get("date") || todayKolkata(),
      departmentId: Number(url.searchParams.get("departmentId") || 0) || undefined,
      subjectId: Number(url.searchParams.get("subjectId") || 0) || undefined,
      courseId: Number(url.searchParams.get("courseId") || 0) || undefined,
    });
    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export async function monthlyReportHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const report = await buildReport(
      "Monthly Attendance Report",
      {
        month: url.searchParams.get("month") || todayKolkata().slice(0, 7),
        departmentId: Number(url.searchParams.get("departmentId") || 0) || undefined,
        subjectId: Number(url.searchParams.get("subjectId") || 0) || undefined,
      },
      "summary",
    );
    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export async function studentReportHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const student = await findStudent(/^\d+$/.test(id) ? Number(id) : id);
    if (!student) return fail("Student not found", 404);
    if (auth.user.role === "STUDENT" && auth.user.student?.id !== student.id) return fail("You do not have permission to perform this action.", 403);
    const url = new URL(req.url);
    const report = await buildReport("Student Attendance Report", {
      studentDbId: student.id,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    });
    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export async function departmentReportHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const departmentId = Number(url.searchParams.get("departmentId") || 0);
    if (!departmentId) return fail("Select a department.");
    const report = await buildReport(
      "Department Attendance Report",
      { departmentId, from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined, month: url.searchParams.get("month") || undefined },
      "summary",
    );
    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export async function subjectReportHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const subjectId = Number(url.searchParams.get("subjectId") || 0);
    if (!subjectId) return fail("Select a subject.");
    const report = await buildReport("Subject Attendance Report", {
      subjectId,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      month: url.searchParams.get("month") || undefined,
    });
    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export async function adminAnalyticsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    return ok({ analytics: await adminAnalytics() });
  } catch (error) {
    return handleError(error);
  }
}

export async function studentAnalyticsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["STUDENT"], req);
    if (auth.error) return auth.error;
    if (!auth.user.student) return fail("Student profile not found.", 404);
    const month = new URL(req.url).searchParams.get("month") || undefined;
    const analytics = await studentAnalytics(auth.user.student.id, auth.user.id, month);
    return ok({ analytics });
  } catch (error) {
    return handleError(error);
  }
}

export async function listNotificationsHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const rows = await db.select().from(notifications).where(eq(notifications.userId, auth.user.id)).orderBy(desc(notifications.createdAt)).limit(40);
    return ok({
      data: rows.map((row) => ({ ...row, createdAt: formatDateTime(row.createdAt) })),
      unread: rows.filter((row) => !row.read).length,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function readNotificationHandler(req: Request, id: string) {
  try {
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    const notificationId = parseId(id);
    if (notificationId instanceof Response) return notificationId;
    const [row] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, auth.user.id)))
      .returning();
    if (!row) return fail("Notification not found.", 404);
    return ok({ message: "Notification marked as read." });
  } catch (error) {
    return handleError(error);
  }
}

export async function readAllNotificationsHandler(req: Request) {
  try {
    const auth = await requireUser(undefined, req);
    if (auth.error) return auth.error;
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, auth.user.id));
    return ok({ message: "All notifications marked as read." });
  } catch (error) {
    return handleError(error);
  }
}

export async function scansHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const limit = Math.min(30, Number(new URL(req.url).searchParams.get("limit") || 12));
    return ok({ data: await latestScans(limit) });
  } catch (error) {
    return handleError(error);
  }
}

export async function settingsGetHandler(req: Request) {
  try {
    await ensureSeed();
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    return ok({ settings: await getSettings() });
  } catch (error) {
    return handleError(error);
  }
}

export async function settingsPutHandler(req: Request) {
  try {
    const auth = await requireUser(["ADMIN"], req);
    if (auth.error) return auth.error;
    const parsed = settingsSchema.safeParse(await readBody(req));
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const saved = await saveSettings({
      institutionName: parsed.data.institutionName,
      academicYear: parsed.data.academicYear,
      campusName: parsed.data.campusName,
      lateAfter: parsed.data.lateAfter,
      cooldownSeconds: String(parsed.data.cooldownSeconds),
      halfDayHours: String(parsed.data.halfDayHours),
      lowAttendance: String(parsed.data.lowAttendance),
    });
    return ok({ message: "Settings saved.", settings: saved });
  } catch (error) {
    return handleError(error);
  }
}
