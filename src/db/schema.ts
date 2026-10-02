import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Shared value domains. Every constrained column below reuses these so the database
 * rejects a value the application layer would never produce, instead of silently
 * storing it and breaking downstream comparisons.
 */
export const ATTENDANCE_STATUS_DOMAIN = ["Present", "Late", "Absent", "Half Day", "Leave"] as const;
export const DEVICE_STATUS_DOMAIN = ["ONLINE", "OFFLINE"] as const;
export const DEVICE_TRUST_DOMAIN = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export const SCAN_DIRECTION_DOMAIN = ["IN", "OUT", "AUTO"] as const;
export const CARD_STATUS_DOMAIN = ["ASSIGNED", "UNASSIGNED", "BLOCKED"] as const;
export const USER_ROLE_DOMAIN = ["ADMIN", "STUDENT"] as const;
export const STUDENT_STATUS_DOMAIN = ["ACTIVE", "INACTIVE"] as const;
export const EXIT_SOURCE_DOMAIN = ["SCAN", "AUTO_CLOSE", "MANUAL"] as const;
export const ANOMALY_SEVERITY_DOMAIN = ["warning", "critical"] as const;

/**
 * Builds a `col in ('a', 'b')` predicate for use in a CHECK constraint.
 * Values are inlined as quoted literals rather than bound parameters, because a
 * migration file is replayed as plain DDL text with no parameter binding.
 */
function inDomain(column: string, values: readonly string[]) {
  const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
  return sql`${sql.raw(column)} in (${sql.raw(list)})`;
}

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 190 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("users_role_idx").on(t.role),
    check("users_role_check", inDomain("role", USER_ROLE_DOMAIN)),
  ],
);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // Surrogate `id` is the PK, so a per-department business code is the only useful uniqueness.
  (t) => [uniqueIndex("courses_department_code_uidx").on(t.departmentId, t.code)],
);

export const semesters = pgTable(
  "semesters",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
  },
  (t) => [
    uniqueIndex("semesters_course_number_uidx").on(t.courseId, t.number),
    check("semesters_number_check", sql`${t.number} >= 1`),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    semesterNumber: integer("semester_number").notNull(),
    name: varchar("name", { length: 20 }).notNull(),
  },
  (t) => [
    uniqueIndex("sections_course_sem_name_uidx").on(t.courseId, t.semesterNumber, t.name),
    check("sections_semester_number_check", sql`${t.semesterNumber} >= 1`),
  ],
);

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentCode: varchar("student_code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 190 }).notNull().unique(),
    phone: varchar("phone", { length: 24 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 20 }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    semester: integer("semester").notNull(),
    section: varchar("section", { length: 20 }).notNull(),
    enrollmentNumber: varchar("enrollment_number", { length: 40 }).notNull().unique(),
    rfidUid: varchar("rfid_uid", { length: 32 }).unique(),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("students_semester_check", sql`${t.semester} >= 1`),
    check("students_status_check", inDomain("status", STUDENT_STATUS_DOMAIN)),
    // The student's section is scoped to (course, semester); index the pair that gates that lookup.
    index("students_course_semester_section_idx").on(t.courseId, t.semester, t.section),
    index("students_department_idx").on(t.departmentId),
    index("students_status_idx").on(t.status),
  ],
);

export const teachers = pgTable(
  "teachers",
  {
    id: serial("id").primaryKey(),
    teacherCode: varchar("teacher_code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 190 }).notNull().unique(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("teachers_department_idx").on(t.departmentId)],
);

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    subjectCode: varchar("subject_code", { length: 40 }).notNull().unique(),
    subjectName: varchar("subject_name", { length: 160 }).notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    semester: integer("semester").notNull(),
    teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("subjects_semester_check", sql`${t.semester} >= 1`),
    index("subjects_department_idx").on(t.departmentId),
    index("subjects_teacher_idx").on(t.teacherId),
  ],
);

export const schedules = pgTable(
  "schedules",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    semester: integer("semester").notNull(),
    section: varchar("section", { length: 20 }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
  },
  (t) => [
    check("schedules_semester_check", sql`${t.semester} >= 1`),
    // Sunday(0) .. Saturday(6), matching the day numbering used by the timetable UI.
    check("schedules_day_of_week_check", sql`${t.dayOfWeek} between 0 and 6`),
    // "HH:MM" in 24-hour form, stored as text.
    check("schedules_start_time_check", sql`${t.startTime} ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'`),
    check("schedules_end_time_check", sql`${t.endTime} ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'`),
    check("schedules_time_order_check", sql`${t.endTime} > ${t.startTime}`),
    index("schedules_lookup_idx").on(t.courseId, t.semester, t.dayOfWeek),
    index("schedules_subject_idx").on(t.subjectId),
  ],
);

export const rfidCards = pgTable(
  "rfid_cards",
  {
    id: serial("id").primaryKey(),
    uid: varchar("uid", { length: 32 }).notNull().unique(),
    studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
    lastScan: timestamp("last_scan", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("UNASSIGNED"),
  },
  (t) => [
    check("rfid_cards_status_check", inDomain("status", CARD_STATUS_DOMAIN)),
    // An ASSIGNED/BLOCKED card must point at a student; UNASSIGNED must not.
    check(
      "rfid_cards_assignment_check",
      sql`(${t.status} = 'UNASSIGNED' and ${t.studentId} is null) or (${t.status} <> 'UNASSIGNED' and ${t.studentId} is not null)`,
    ),
    index("rfid_cards_student_idx").on(t.studentId),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    deviceCode: varchar("device_code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    status: varchar("status", { length: 20 }).notNull().default("OFFLINE"),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    firmwareVersion: varchar("firmware_version", { length: 40 }),
    /** Comma-separated CIDR/IP allowlist. Empty = any source address permitted. */
    allowedIps: text("allowed_ips"),
    /**
     * Reader enrolment state. Devices are provisioned by an ADMIN and must be
     * ACTIVE before they can mark attendance; auto-registration is off by default.
     */
    trustState: varchar("trust_state", { length: 20 }).notNull().default("PENDING"),
    /** Direction this fixed reader is wired for. */
    scanDirection: varchar("scan_direction", { length: 10 }).notNull().default("AUTO"),
    latitude: varchar("latitude", { length: 20 }),
    longitude: varchar("longitude", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("devices_status_check", inDomain("status", DEVICE_STATUS_DOMAIN)),
    check("devices_trust_state_check", inDomain("trust_state", DEVICE_TRUST_DOMAIN)),
    check("devices_scan_direction_check", inDomain("scan_direction", SCAN_DIRECTION_DOMAIN)),
    index("devices_trust_state_idx").on(t.trustState),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    rfidUid: varchar("rfid_uid", { length: 32 }),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    entryTime: timestamp("entry_time", { withTimezone: true }),
    exitTime: timestamp("exit_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull(),
    scanType: varchar("scan_type", { length: 20 }),
    deviceId: varchar("device_id", { length: 40 }),
    /** How the exit stamp was produced: SCAN, AUTO_CLOSE or MANUAL. */
    exitSource: varchar("exit_source", { length: 20 }).notNull().default("SCAN"),
    /** Machine-readable integrity signals raised while processing this record. */
    anomalyFlags: jsonb("anomaly_flags").$type<string[]>().default([]).notNull(),
    /** Minutes between entry and exit, derived server-side. Null while still open. */
    durationMinutes: integer("duration_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("attendance_student_date_uidx").on(t.studentId, t.date),
    index("attendance_date_idx").on(t.date),
    // Reporting and the live board both filter by date plus a dimension at a time.
    index("attendance_date_subject_idx").on(t.date, t.subjectId),
    index("attendance_date_status_idx").on(t.date, t.status),
    index("attendance_student_idx").on(t.studentId),
    check("attendance_status_check", inDomain("status", ATTENDANCE_STATUS_DOMAIN)),
    check("attendance_exit_source_check", inDomain("exit_source", EXIT_SOURCE_DOMAIN)),
    check("attendance_duration_check", sql`${t.durationMinutes} is null or ${t.durationMinutes} >= 0`),
    // An exit stamp can never precede the entry it closes.
    check("attendance_exit_after_entry_check", sql`${t.exitTime} is null or ${t.entryTime} is null or ${t.exitTime} >= ${t.entryTime}`),
  ],
);

/**
 * Human-reviewable integrity signals. Kept separate from attendance so a record can
 * be flagged without mutating it, and so reviewers have an explicit workflow.
 */
export const attendanceAnomalies = pgTable(
  "attendance_anomalies",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attendanceId: integer("attendance_id").references(() => attendance.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    kind: varchar("kind", { length: 40 }).notNull(),
    detail: text("detail"),
    deviceId: varchar("device_id", { length: 40 }),
    severity: varchar("severity", { length: 20 }).notNull().default("warning"),
    reviewed: boolean("reviewed").notNull().default(false),
    reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("anomalies_student_date_idx").on(t.studentId, t.date),
    index("anomalies_reviewed_idx").on(t.reviewed),
    index("anomalies_date_idx").on(t.date),
    index("anomalies_attendance_idx").on(t.attendanceId),
    check("attendance_anomalies_severity_check", inDomain("severity", ANOMALY_SEVERITY_DOMAIN)),
    // A review is only meaningful once someone has signed off and stamped a time.
    check(
      "attendance_anomalies_review_check",
      sql`(${t.reviewed} and ${t.reviewedBy} is not null and ${t.reviewedAt} is not null) or (not ${t.reviewed} and ${t.reviewedBy} is null and ${t.reviewedAt} is null)`,
    ),
  ],
);

export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: serial("id").primaryKey(),
    attendanceId: integer("attendance_id").references(() => attendance.id, { onDelete: "set null" }),
    action: varchar("action", { length: 40 }).notNull(),
    performedBy: integer("performed_by").references(() => users.id, { onDelete: "set null" }),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("attendance_logs_attendance_idx").on(t.attendanceId, t.timestamp)],
);

export const rfidScans = pgTable(
  "rfid_scans",
  {
    id: serial("id").primaryKey(),
    rfidUid: varchar("rfid_uid", { length: 32 }).notNull(),
    deviceId: varchar("device_id", { length: 40 }),
    studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
    success: boolean("success").notNull(),
    message: text("message"),
    scanType: varchar("scan_type", { length: 20 }),
    status: varchar("status", { length: 20 }),
    /** Client-claimed device clock, kept only for drift diagnostics. */
    deviceTimestamp: timestamp("device_timestamp", { withTimezone: true }),
    /** Server receipt time: the authoritative moment the scan was accepted. */
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    sourceIp: varchar("source_ip", { length: 64 }),
    /** False when the source address was outside the reader's allowlist. */
    ipTrusted: boolean("ip_trusted"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("rfid_scans_created_idx").on(t.createdAt),
    index("rfid_scans_uid_created_idx").on(t.rfidUid, t.createdAt),
    index("rfid_scans_device_created_idx").on(t.deviceId, t.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 30 }).notNull().default("info"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.read, t.createdAt)],
);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type AttendanceRecord = typeof attendance.$inferSelect;
