import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendance,
  courses,
  departments,
  devices,
  notifications,
  rfidCards,
  students,
  subjects,
  teachers,
} from "@/db/schema";
import { attendanceScore, formatTime, monthLabel, percentage, shiftKolkataDate, todayKolkata } from "@/lib/format";
import { notifyUser } from "@/server/notify";
import { getSettings } from "@/server/settings";
import { latestScans } from "@/server/rfid";

export async function refreshDevicePresence() {
  const rows = await db.select().from(devices);
  const now = Date.now();
  for (const device of rows) {
    const stale = !device.lastSeen || now - new Date(device.lastSeen).getTime() > 3 * 60 * 1000;
    const next = stale ? "OFFLINE" : "ONLINE";
    if (device.status !== next) {
      await db.update(devices).set({ status: next }).where(eq(devices.id, device.id));
      if (next === "OFFLINE") {
        const { notifyAdminsOnce } = await import("@/server/notify");
        await notifyAdminsOnce(`${device.deviceCode} is offline`, `${device.name} at ${device.location} has not checked in recently.`, "warning");
      }
    }
  }
  return db.select().from(devices).orderBy(devices.deviceCode);
}

export async function adminAnalytics() {
  const settings = await getSettings();
  const today = todayKolkata();
  const [studentRows, attendanceRows, cards, deviceRows, scans] = await Promise.all([
    db
      .select({
        id: students.id,
        studentCode: students.studentCode,
        name: students.name,
        status: students.status,
        departmentId: students.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        courseName: courses.name,
        semester: students.semester,
        section: students.section,
        rfidUid: students.rfidUid,
      })
      .from(students)
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id)),
    db
      .select({
        studentId: attendance.studentId,
        date: attendance.date,
        status: attendance.status,
        subjectId: attendance.subjectId,
        subjectName: subjects.subjectName,
        departmentId: students.departmentId,
        departmentName: departments.name,
        courseName: courses.name,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .innerJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id)),
    db.select().from(rfidCards),
    refreshDevicePresence(),
    latestScans(10),
  ]);

  const active = studentRows.filter((student) => student.status === "ACTIVE");
  const todayRows = attendanceRows.filter((row) => row.date === today);
  const presentToday = todayRows.filter((row) => row.status === "Present").length;
  const lateToday = todayRows.filter((row) => row.status === "Late").length;
  const halfToday = todayRows.filter((row) => row.status === "Half Day").length;
  const leaveToday = todayRows.filter((row) => row.status === "Leave").length;
  const markedIn = new Set(todayRows.filter((row) => ["Present", "Late", "Half Day", "Leave"].includes(row.status)).map((row) => row.studentId));
  const absentToday = active.filter((student) => !markedIn.has(student.id)).length;
  const attendancePercentage = percentage(presentToday + lateToday + halfToday, active.length);

  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = shiftKolkataDate(today, index - 13);
    const rows = attendanceRows.filter((row) => row.date === date);
    return {
      date: date.slice(5),
      fullDate: date,
      present: rows.filter((row) => row.status === "Present").length,
      late: rows.filter((row) => row.status === "Late").length,
      absent: rows.filter((row) => row.status === "Absent").length,
    };
  });

  const monthlyMap = new Map<string, { status: string }[]>();
  for (const row of attendanceRows) {
    const key = row.date.slice(0, 7);
    monthlyMap.set(key, [...(monthlyMap.get(key) ?? []), row]);
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, rows]) => ({ month: monthLabel(month), percentage: attendanceScore(rows).percentage }));

  const weekly = Array.from({ length: 6 }, (_, index) => {
    const end = shiftKolkataDate(today, -index * 7);
    const start = shiftKolkataDate(end, -6);
    const rows = attendanceRows.filter((row) => row.date >= start && row.date <= end);
    return { week: `${start.slice(8)}–${end.slice(8)} ${end.slice(5, 7)}`, percentage: attendanceScore(rows).percentage };
  }).reverse();

  function groupPercentage(keyFn: (row: (typeof attendanceRows)[number]) => string) {
    const groups = new Map<string, { status: string }[]>();
    for (const row of attendanceRows) {
      const key = keyFn(row);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].map(([name, rows]) => ({ name, percentage: attendanceScore(rows).percentage, total: rows.length }));
  }

  const statusMix = ["Present", "Late", "Absent", "Half Day", "Leave"].map((name) => ({
    name,
    value: attendanceRows.filter((row) => row.status === name).length,
  }));

  const absentStudents = active
    .filter((student) => !markedIn.has(student.id))
    .slice(0, 8)
    .map((student) => ({
      id: student.id,
      studentId: student.studentCode,
      name: student.name,
      department: student.departmentCode,
      semester: student.semester,
    }));

  return {
    institution: settings.institutionName,
    stats: {
      totalStudents: studentRows.length,
      presentToday,
      absentToday,
      lateToday,
      halfToday,
      leaveToday,
      attendancePercentage,
      registeredRfid: cards.filter((card) => card.status === "ASSIGNED").length,
      activeDevices: deviceRows.filter((device) => device.status === "ONLINE").length,
      totalDevices: deviceRows.length,
    },
    charts: {
      daily,
      weekly,
      monthly,
      departments: groupPercentage((row) => row.departmentName),
      courses: groupPercentage((row) => row.courseName),
      subjects: groupPercentage((row) => row.subjectName || "Unassigned"),
      statusMix,
    },
    absentStudents,
    devices: deviceRows,
    live: scans,
  };
}

export async function studentAnalytics(studentId: number, userId: number, month?: string) {
  const settings = await getSettings();
  const [student] = await db
    .select({
      id: students.id,
      studentCode: students.studentCode,
      name: students.name,
      email: students.email,
      phone: students.phone,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      semester: students.semester,
      section: students.section,
      enrollmentNumber: students.enrollmentNumber,
      rfidUid: students.rfidUid,
      status: students.status,
      department: departments.name,
      departmentCode: departments.code,
      course: courses.name,
    })
    .from(students)
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(courses, eq(students.courseId, courses.id))
    .where(eq(students.id, studentId))
    .limit(1);
  if (!student) return null;

  const rows = await db
    .select({
      id: attendance.id,
      date: attendance.date,
      status: attendance.status,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      deviceId: attendance.deviceId,
      subjectName: subjects.subjectName,
      subjectCode: subjects.subjectCode,
      teacherName: teachers.name,
    })
    .from(attendance)
    .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
    .leftJoin(teachers, eq(attendance.teacherId, teachers.id))
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.date));

  const score = attendanceScore(rows);
  if (score.percentage < settings.lowAttendance && score.counted >= 5) {
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.title, "Your attendance is below 75%."),
          gte(notifications.createdAt, new Date(Date.now() - 7 * 86400000)),
        ),
      )
      .limit(1);
    if (!existing) {
      await notifyUser(
        userId,
        "Your attendance is below 75%.",
        `Current attendance is ${score.percentage}%. The policy threshold is ${settings.lowAttendance}%.`,
        "warning",
      );
    }
  }

  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : todayKolkata().slice(0, 7);
  const monthlyMap = new Map<string, { status: string }[]>();
  const subjectMap = new Map<string, { status: string }[]>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    monthlyMap.set(key, [...(monthlyMap.get(key) ?? []), row]);
    const subject = row.subjectName || "General";
    subjectMap.set(subject, [...(subjectMap.get(subject) ?? []), row]);
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthName, group]) => ({ month: monthLabel(monthName), key: monthName, ...attendanceScore(group) }));
  const subjectWise = [...subjectMap.entries()].map(([name, group]) => ({ name, ...attendanceScore(group) }));
  const trend = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((row, index, list) => ({
      date: row.date.slice(5),
      percentage: attendanceScore(list.slice(0, index + 1)).percentage,
    }));

  return {
    profile: {
      ...student,
      studentId: student.studentCode,
      rfidStatus: student.rfidUid ? "CONNECTED" : "NOT REGISTERED",
    },
    stats: {
      percentage: score.percentage,
      present: score.present,
      absent: score.absent,
      late: score.late,
      half: score.half,
      leave: score.leave,
      total: score.total,
    },
    monthly,
    subjects: subjectWise,
    trend,
    calendar: rows.filter((row) => row.date.startsWith(monthKey)).map((row) => ({ date: row.date, status: row.status })),
    month: monthKey,
    recent: rows.slice(0, 8).map((row) => ({
      ...row,
      entryTime: formatTime(row.entryTime),
      exitTime: formatTime(row.exitTime),
      subject: row.subjectName || "—",
      teacher: row.teacherName || "—",
    })),
    threshold: settings.lowAttendance,
  };
}
