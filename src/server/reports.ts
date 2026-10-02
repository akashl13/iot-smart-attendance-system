import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, courses, departments, students, subjects, teachers } from "@/db/schema";
import { attendanceScore, formatDate, formatDateTime, formatTime, todayKolkata } from "@/lib/format";
import { getSettings } from "@/server/settings";

type Filters = {
  date?: string;
  month?: string;
  from?: string;
  to?: string;
  departmentId?: number;
  subjectId?: number;
  studentDbId?: number;
  courseId?: number;
};

async function loadRows(filters: Filters) {
  const where = [];
  if (filters.date) where.push(eq(attendance.date, filters.date));
  if (filters.month) where.push(sql`${attendance.date}::text like ${`${filters.month}-%`}`);
  if (filters.from) where.push(gte(attendance.date, filters.from));
  if (filters.to) where.push(lte(attendance.date, filters.to));
  if (filters.departmentId) where.push(eq(students.departmentId, filters.departmentId));
  if (filters.courseId) where.push(eq(students.courseId, filters.courseId));
  if (filters.subjectId) where.push(eq(attendance.subjectId, filters.subjectId));
  if (filters.studentDbId) where.push(eq(attendance.studentId, filters.studentDbId));
  return db
    .select({
      id: attendance.id,
      date: attendance.date,
      status: attendance.status,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      deviceId: attendance.deviceId,
      rfidUid: attendance.rfidUid,
      studentDbId: students.id,
      studentId: students.studentCode,
      studentName: students.name,
      email: students.email,
      semester: students.semester,
      section: students.section,
      department: departments.name,
      departmentCode: departments.code,
      course: courses.name,
      subject: subjects.subjectName,
      subjectCode: subjects.subjectCode,
      teacher: teachers.name,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(courses, eq(students.courseId, courses.id))
    .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
    .leftJoin(teachers, eq(attendance.teacherId, teachers.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(attendance.date, students.name);
}

function presentable(rows: Awaited<ReturnType<typeof loadRows>>) {
  return rows.map((row) => ({
    ...row,
    entryTime: formatTime(row.entryTime) || "—",
    exitTime: formatTime(row.exitTime) || "—",
    subject: row.subject || "—",
    teacher: row.teacher || "—",
    deviceId: row.deviceId || "—",
  }));
}

export async function buildReport(title: string, filters: Filters, mode: "detail" | "summary" = "detail") {
  const settings = await getSettings();
  const rows = await loadRows(filters);
  const score = attendanceScore(rows);
  const range = filters.date
    ? formatDate(filters.date)
    : filters.month
      ? filters.month
      : `${filters.from ? formatDate(filters.from) : "Start"} to ${filters.to ? formatDate(filters.to) : formatDate(todayKolkata())}`;

  let table: Record<string, unknown>[] = presentable(rows);
  if (mode === "summary") {
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.studentId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    table = [...grouped.values()].map((group) => {
      const sample = group[0];
      const summary = attendanceScore(group);
      return {
        ...presentable([sample])[0],
        date: range,
        status: `${summary.percentage}%`,
        entryTime: String(summary.present + summary.late),
        exitTime: String(summary.absent),
        subject: sample.subject || "All subjects",
        teacher: `${summary.total} classes`,
        deviceId: sample.departmentCode,
        percentage: summary.percentage,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        total: summary.total,
      };
    });
  }

  return {
    institution: settings.institutionName,
    campus: settings.campusName,
    academicYear: settings.academicYear,
    title,
    dateRange: range,
    generatedAt: formatDateTime(new Date()),
    summary: score,
    rows: table,
  };
}
