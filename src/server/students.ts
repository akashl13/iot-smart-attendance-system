import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { courses, departments, rfidCards, students, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { normalizeUid } from "@/lib/format";
import { notifyUser } from "@/server/notify";
import { assignCard } from "@/server/rfid";

export type StudentInput = {
  name: string;
  studentId: string;
  email: string;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  departmentId: number;
  courseId: number;
  semester: number;
  section: string;
  enrollmentNumber: string;
  password?: string | null;
  status?: string | null;
  rfidUID?: string | null;
};

export async function assertAcademic(departmentId: number, courseId: number) {
  const [department] = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!department) return "Department not found.";
  if (!course || course.departmentId !== departmentId) return "Selected course does not belong to this department.";
  return null;
}

export async function createStudentAccount(input: StudentInput) {
  const academicError = await assertAcademic(input.departmentId, input.courseId);
  if (academicError) return { error: academicError, status: 400 as const };
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password && input.password.length >= 8 ? input.password : "Student@123");
  const [user] = await db
    .insert(users)
    .values({ name: input.name.trim(), email, passwordHash, role: "STUDENT" })
    .returning();
  const [student] = await db
    .insert(students)
    .values({
      userId: user.id,
      studentCode: input.studentId.trim().toUpperCase(),
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      dateOfBirth: input.dateOfBirth || null,
      gender: input.gender || null,
      departmentId: input.departmentId,
      courseId: input.courseId,
      semester: input.semester,
      section: input.section.trim().toUpperCase(),
      enrollmentNumber: input.enrollmentNumber.trim().toUpperCase(),
      status: input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })
    .returning();
  if (input.rfidUID) {
    const assigned = await assignCard(input.rfidUID, student.id);
    if ("error" in assigned) {
      await db.delete(students).where(eq(students.id, student.id));
      await db.delete(users).where(eq(users.id, user.id));
      return { error: assigned.error, status: assigned.status };
    }
  }
  await notifyUser(user.id, "Welcome to SmartAttend", "Your student account is ready. RFID attendance will appear here after your first scan.", "info");
  return { student, user };
}

export async function updateStudentAccount(id: number, input: Partial<StudentInput>) {
  const [current] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  if (!current) return { error: "Student not found", status: 404 as const };
  const departmentId = input.departmentId ?? current.departmentId;
  const courseId = input.courseId ?? current.courseId;
  const academicError = await assertAcademic(departmentId, courseId);
  if (academicError) return { error: academicError, status: 400 as const };
  const email = input.email ? input.email.trim().toLowerCase() : current.email;
  const [emailOwner] = await db.select().from(users).where(and(eq(users.email, email), ne(users.id, current.userId))).limit(1);
  if (emailOwner) return { error: "An account with this email already exists.", status: 409 as const };
  if (input.studentId) {
    const [codeOwner] = await db
      .select()
      .from(students)
      .where(and(eq(students.studentCode, input.studentId.trim().toUpperCase()), ne(students.id, id)))
      .limit(1);
    if (codeOwner) return { error: "This student ID is already registered.", status: 409 as const };
  }
  if (input.enrollmentNumber) {
    const [enrollOwner] = await db
      .select()
      .from(students)
      .where(and(eq(students.enrollmentNumber, input.enrollmentNumber.trim().toUpperCase()), ne(students.id, id)))
      .limit(1);
    if (enrollOwner) return { error: "This enrollment number is already registered.", status: 409 as const };
  }

  await db
    .update(students)
    .set({
      name: input.name?.trim() ?? current.name,
      studentCode: input.studentId ? input.studentId.trim().toUpperCase() : current.studentCode,
      email,
      phone: input.phone?.trim() ?? current.phone,
      dateOfBirth: input.dateOfBirth === undefined ? current.dateOfBirth : input.dateOfBirth || null,
      gender: input.gender === undefined ? current.gender : input.gender,
      departmentId,
      courseId,
      semester: input.semester ?? current.semester,
      section: input.section ? input.section.trim().toUpperCase() : current.section,
      enrollmentNumber: input.enrollmentNumber ? input.enrollmentNumber.trim().toUpperCase() : current.enrollmentNumber,
      status: input.status ?? current.status,
    })
    .where(eq(students.id, id));
  await db
    .update(users)
    .set({ name: input.name?.trim() ?? current.name, email })
    .where(eq(users.id, current.userId));
  if (input.password && input.password.length >= 8) {
    const passwordHash = await hashPassword(input.password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, current.userId));
  }
  if (input.rfidUID !== undefined) {
    const trimmed = input.rfidUID?.trim();
    if (!trimmed) {
      if (current.rfidUid) {
        await db.update(rfidCards).set({ studentId: null, status: "UNASSIGNED" }).where(eq(rfidCards.uid, current.rfidUid));
        await db.update(students).set({ rfidUid: null }).where(eq(students.id, id));
      }
    } else if (normalizeUid(trimmed) !== current.rfidUid) {
      const assigned = await assignCard(trimmed, id);
      if ("error" in assigned) return { error: assigned.error, status: assigned.status };
    }
  }
  const [updated] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return { student: updated };
}

export async function deleteStudentAccount(id: number) {
  const [student] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  if (!student) return { error: "Student not found", status: 404 as const };
  if (student.rfidUid) {
    await db.update(rfidCards).set({ studentId: null, status: "UNASSIGNED" }).where(eq(rfidCards.uid, student.rfidUid));
  }
  await db.delete(students).where(eq(students.id, id));
  await db.delete(users).where(eq(users.id, student.userId));
  return { ok: true };
}
