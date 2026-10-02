import { z } from "zod";

const uid = z.string().trim().min(4, "RFID UID is required.").max(40, "RFID UID is too long.");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  portal: z.enum(["admin", "student"]).optional(),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "Full name is required.").max(160),
    studentId: z.string().trim().min(4, "Student ID is required.").max(40),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().min(10, "Enter a valid phone number.").max(20),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required."),
    gender: z.enum(["Male", "Female", "Other"]),
    departmentId: z.coerce.number().int().positive("Select a department."),
    courseId: z.coerce.number().int().positive("Select a course."),
    semester: z.coerce.number().int().min(1).max(10),
    section: z.string().trim().min(1, "Section is required.").max(20),
    enrollmentNumber: z.string().trim().min(4, "Enrollment number is required.").max(40),
    password: z.string().min(8, "Password must be at least 8 characters.").max(72),
    confirmPassword: z.string().min(8).max(72),
    rfidUID: uid,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const studentWriteSchema = z.object({
  name: z.string().trim().min(3).max(160),
  studentId: z.string().trim().min(4).max(40),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  departmentId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().min(1).max(10),
  section: z.string().trim().min(1).max(20),
  enrollmentNumber: z.string().trim().min(4).max(40),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
  rfidUID: z.string().trim().max(40).optional().or(z.literal("")),
});

export const scanSchema = z.object({
  rfidUID: uid,
  deviceId: z.string().trim().min(2, "Device ID is required.").max(40),
  /** Fixed readers declare their wiring; AUTO keeps the legacy entry/exit toggle. */
  scanDirection: z.enum(["IN", "OUT", "AUTO"]).optional(),
  /** Reader clock, used only to measure drift. Never used to date the attendance. */
  deviceTimestamp: z.coerce.date().optional(),
  firmwareVersion: z.string().trim().max(40).optional(),
});

export const rfidRegisterSchema = z.object({
  rfidUID: uid,
  studentId: z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]),
});

export const rfidUpdateSchema = z.object({
  studentId: z.union([z.coerce.number().int().positive(), z.string(), z.null()]).optional(),
  status: z.enum(["ASSIGNED", "UNASSIGNED", "BLOCKED"]).optional(),
});

export const attendanceWriteSchema = z.object({
  studentId: z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required."),
  status: z.enum(["Present", "Late", "Absent", "Half Day", "Leave"]),
  entryTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).nullable(),
  exitTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).nullable(),
  subjectId: z.coerce.number().int().positive().optional().nullable(),
  deviceId: z.string().trim().max(40).optional().or(z.literal("")).nullable(),
  rfidUID: z.string().trim().max(40).optional().or(z.literal("")).nullable(),
});

export const subjectSchema = z.object({
  subjectName: z.string().trim().min(2).max(160),
  subjectCode: z.string().trim().min(2).max(40),
  departmentId: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().min(1).max(10),
  teacherId: z.coerce.number().int().positive().optional().nullable(),
});

export const teacherSchema = z.object({
  teacherId: z.string().trim().min(2).max(40),
  name: z.string().trim().min(3).max(160),
  email: z.string().trim().email(),
  departmentId: z.coerce.number().int().positive(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(20),
});

export const courseSchema = z.object({
  name: z.string().trim().min(2).max(180),
  code: z.string().trim().min(2).max(20),
  departmentId: z.coerce.number().int().positive(),
});

export const semesterSchema = z.object({
  courseId: z.coerce.number().int().positive(),
  number: z.coerce.number().int().min(1).max(12),
  name: z.string().trim().min(2).max(80).optional(),
});

export const sectionSchema = z.object({
  courseId: z.coerce.number().int().positive(),
  semesterNumber: z.coerce.number().int().min(1).max(12),
  name: z.string().trim().min(1).max(20),
});

export const deviceSchema = z.object({
  deviceId: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(160),
  ipAddress: z.string().trim().max(64).optional().or(z.literal("")),
  firmwareVersion: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["ONLINE", "OFFLINE"]).optional(),
  trustState: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
});

export const heartbeatSchema = z.object({
  deviceId: z.string().trim().min(2).max(40),
  ipAddress: z.string().trim().max(64).optional(),
  firmwareVersion: z.string().trim().max(40).optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const settingsSchema = z.object({
  institutionName: z.string().trim().min(2).max(160),
  academicYear: z.string().trim().min(4).max(20),
  campusName: z.string().trim().min(2).max(160),
  lateAfter: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM for the late cutoff."),
  cooldownSeconds: z.coerce.number().int().min(10).max(3600),
  halfDayHours: z.coerce.number().min(1).max(12),
  lowAttendance: z.coerce.number().min(1).max(100),
});

export function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid input.";
}
