import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
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
  schedules,
  sections,
  semesters,
  settings,
  students,
  subjects,
  teachers,
  users,
} from "@/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { kolkataDateTime, shiftKolkataDate, todayKolkata, weekdayOf } from "@/lib/format";

let seedPromise: Promise<void> | null = null;

export function ensureSeed() {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classDates(total: number) {
  const dates: string[] = [];
  let cursor = shiftKolkataDate(todayKolkata(), -1);
  while (dates.length < total) {
    if (weekdayOf(cursor) !== 0) dates.push(cursor);
    cursor = shiftKolkataDate(cursor, -1);
  }
  return dates.reverse();
}

function at(date: string, hour: number, minute: number) {
  return kolkataDateTime(date, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

export async function runSeed() {
  const [{ value }] = await db.select({ value: count() }).from(users);
  if (Number(value) > 0) return;

  const adminHash = await bcrypt.hash("Admin@123", 10);
  const studentHash = await bcrypt.hash("Student@123", 10);
  const rand = mulberry32(20260327);
  const pick = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const departmentSeed = [
    { name: "Computer Applications (MCA)", code: "MCA" },
    { name: "Computer Applications (BCA)", code: "BCA" },
    { name: "Computer Science & Engineering", code: "CSE" },
    { name: "Information Technology", code: "IT" },
  ];
  const courseSeed = [
    { name: "Master of Computer Applications", code: "MCA", department: "MCA" },
    { name: "Bachelor of Computer Applications", code: "BCA", department: "BCA" },
    { name: "B.Tech Computer Science", code: "CSE", department: "CSE" },
    { name: "B.Tech Information Technology", code: "IT", department: "IT" },
  ];
  const people = [
    ["Akash Singh", "student@smartattend.com", "MCA", 3, "A", "Male"],
    ["Priya Sharma", "priya.sharma@crestview.edu", "MCA", 3, "A", "Female"],
    ["Rahul Verma", "rahul.verma@crestview.edu", "MCA", 3, "A", "Male"],
    ["Ananya Iyer", "ananya.iyer@crestview.edu", "MCA", 3, "A", "Female"],
    ["Mohammed Farhan", "mohammed.farhan@crestview.edu", "MCA", 3, "A", "Male"],
    ["Sneha Patel", "sneha.patel@crestview.edu", "MCA", 3, "A", "Female"],
    ["Arjun Reddy", "arjun.reddy@crestview.edu", "MCA", 3, "A", "Male"],
    ["Kavya Nair", "kavya.nair@crestview.edu", "MCA", 3, "A", "Female"],
    ["Vikram Joshi", "vikram.joshi@crestview.edu", "MCA", 3, "B", "Male"],
    ["Ishita Banerjee", "ishita.banerjee@crestview.edu", "MCA", 3, "B", "Female"],
    ["Rohan Mehta", "rohan.mehta@crestview.edu", "MCA", 3, "A", "Male"],
    ["Divya Krishnan", "divya.krishnan@crestview.edu", "MCA", 3, "A", "Female"],
    ["Aditya Chauhan", "aditya.chauhan@crestview.edu", "BCA", 2, "A", "Male"],
    ["Neha Gupta", "neha.gupta@crestview.edu", "BCA", 2, "A", "Female"],
    ["Sanjay Rao", "sanjay.rao@crestview.edu", "CSE", 4, "A", "Male"],
    ["Pooja Deshmukh", "pooja.deshmukh@crestview.edu", "CSE", 4, "A", "Female"],
    ["Harsh Malhotra", "harsh.malhotra@crestview.edu", "IT", 3, "A", "Male"],
    ["Meera Pillai", "meera.pillai@crestview.edu", "MCA", 3, "B", "Female"],
    ["Tanvi Kulkarni", "tanvi.kulkarni@crestview.edu", "MCA", 1, "A", "Female"],
    ["Aman Khanna", "aman.khanna@crestview.edu", "IT", 5, "B", "Male"],
  ] as const;
  const uids = [
    "A3 7F 21 9C",
    "B1 44 90 2A",
    "C8 12 77 0E",
    "D4 5A 63 18",
    "E2 90 14 7B",
    "F0 33 AA 41",
    "1C 8E 52 09",
    "6D 21 F4 73",
    "90 AB 10 55",
    "27 64 C1 8D",
    "3E 70 19 A2",
    "58 0C DE 44",
    "77 91 2B 60",
    "8A 4F 03 19",
    "9B 22 81 C7",
    "AA 17 5D 30",
    "BC 66 40 E1",
    "CD 09 72 54",
  ];

  await db.transaction(async (tx) => {
    await tx.insert(settings).values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })));

    const departmentRows = await tx.insert(departments).values(departmentSeed).returning();
    const departmentByCode = Object.fromEntries(departmentRows.map((row) => [row.code, row]));
    const courseRows = await tx
      .insert(courses)
      .values(courseSeed.map((course) => ({ name: course.name, code: course.code, departmentId: departmentByCode[course.department].id })))
      .returning();
    const courseByCode = Object.fromEntries(courseRows.map((row) => [row.code, row]));

    const semesterValues = courseRows.flatMap((course) =>
      [1, 2, 3, 4, 5, 6].map((number) => ({ courseId: course.id, number, name: `Semester ${number}` })),
    );
    await tx.insert(semesters).values(semesterValues);
    await tx.insert(sections).values(
      courseRows.flatMap((course) =>
        [1, 2, 3, 4, 5, 6].flatMap((semesterNumber) =>
          ["A", "B"].map((name) => ({ courseId: course.id, semesterNumber, name })),
        ),
      ),
    );

    const [admin] = await tx
      .insert(users)
      .values({ name: "Prof. Anita Deshpande", email: "admin@smartattend.com", passwordHash: adminHash, role: "ADMIN" })
      .returning();

    const studentUsers = await tx
      .insert(users)
      .values(people.map((person) => ({ name: person[0], email: person[1], passwordHash: studentHash, role: "STUDENT" })))
      .returning();
    const userByEmail = Object.fromEntries(studentUsers.map((user) => [user.email, user]));

    const studentRows = await tx
      .insert(students)
      .values(
        people.map((person, index) => ({
          userId: userByEmail[person[1]].id,
          studentCode: `CU${12345 + index}`,
          name: person[0],
          email: person[1],
          phone: `+91 98765 ${String(10000 + index).slice(1)}`,
          dateOfBirth: `2003-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
          gender: person[5],
          departmentId: departmentByCode[person[2]].id,
          courseId: courseByCode[person[2]].id,
          semester: person[3],
          section: person[4],
          enrollmentNumber: `EN2024${person[2]}${String(index + 1).padStart(3, "0")}`,
          rfidUid: index < uids.length ? uids[index] : null,
          status: "ACTIVE" as const,
        })),
      )
      .returning();

    const teacherSeed = [
      ["TCH1001", "Dr. Neelam Kapoor", "neelam.kapoor@crestview.edu", "MCA"],
      ["TCH1002", "Prof. Suresh Bhatia", "suresh.bhatia@crestview.edu", "MCA"],
      ["TCH1003", "Dr. Fatima Qureshi", "fatima.qureshi@crestview.edu", "CSE"],
      ["TCH1004", "Prof. Manoj Tiwari", "manoj.tiwari@crestview.edu", "IT"],
      ["TCH1005", "Dr. Lakshmi Rao", "lakshmi.rao@crestview.edu", "MCA"],
    ] as const;
    const teacherRows = await tx
      .insert(teachers)
      .values(
        teacherSeed.map((teacher) => ({
          teacherCode: teacher[0],
          name: teacher[1],
          email: teacher[2],
          departmentId: departmentByCode[teacher[3]].id,
        })),
      )
      .returning();
    const teacherByCode = Object.fromEntries(teacherRows.map((row) => [row.teacherCode, row]));

    const subjectSeed = [
      ["MCA301", "Advanced Java", "MCA", 3, "TCH1001"],
      ["MCA302", "Data Science", "MCA", 3, "TCH1005"],
      ["MCA303", "Cloud Computing", "MCA", 3, "TCH1002"],
      ["CSE401", "Operating Systems", "CSE", 4, "TCH1003"],
      ["IT305", "Computer Networks", "IT", 3, "TCH1004"],
    ] as const;
    const subjectRows = await tx
      .insert(subjects)
      .values(
        subjectSeed.map((subject) => ({
          subjectCode: subject[0],
          subjectName: subject[1],
          departmentId: departmentByCode[subject[2]].id,
          semester: subject[3],
          teacherId: teacherByCode[subject[4]].id,
        })),
      )
      .returning();
    const subjectByCode = Object.fromEntries(subjectRows.map((row) => [row.subjectCode, row]));

    const scheduleSeed = [
      ["MCA301", "MCA", 3, "09:00", "10:00"],
      ["MCA302", "MCA", 3, "10:00", "11:00"],
      ["MCA303", "MCA", 3, "11:15", "12:15"],
      ["CSE401", "CSE", 4, "09:30", "10:30"],
      ["IT305", "IT", 3, "10:30", "11:30"],
    ] as const;
    await tx.insert(schedules).values(
      scheduleSeed.flatMap((slot) =>
        [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          subjectId: subjectByCode[slot[0]].id,
          courseId: courseByCode[slot[1]].id,
          semester: slot[2],
          dayOfWeek,
          startTime: slot[3],
          endTime: slot[4],
        })),
      ),
    );

    const now = new Date();
    await tx.insert(devices).values([
      {
        deviceCode: "NODEMCU-01",
        name: "Main Gate RFID",
        location: "Academic Block A · Main Gate",
        ipAddress: "192.168.1.20",
        status: "ONLINE",
        lastSeen: now,
        firmwareVersion: "1.4.2",
        trustState: "ACTIVE",
      },
      {
        deviceCode: "NODEMCU-02",
        name: "Library Entrance",
        location: "Central Library",
        ipAddress: "192.168.1.21",
        status: "ONLINE",
        lastSeen: new Date(now.getTime() - 60_000),
        firmwareVersion: "1.3.8",
        trustState: "ACTIVE",
      },
      {
        deviceCode: "NODEMCU-03",
        name: "CS Lab RFID",
        location: "CS Lab 2",
        ipAddress: "192.168.1.22",
        status: "OFFLINE",
        lastSeen: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        firmwareVersion: "1.2.0",
        trustState: "ACTIVE",
      },
    ]);

    await tx.insert(rfidCards).values([
      ...studentRows.slice(0, uids.length).map((student, index) => ({
        uid: uids[index],
        studentId: student.id,
        status: "ASSIGNED",
        lastScan: index < 8 ? new Date(now.getTime() - index * 15 * 60_000) : null,
      })),
      { uid: "C0 FF EE 01", studentId: null, status: "UNASSIGNED" },
      { uid: "C0 FF EE 02", studentId: null, status: "UNASSIGNED" },
    ]);

    const dates = classDates(12);
    const personByEmail = Object.fromEntries(people.map((person, index) => [person[1], { person, index }])) as Record<string, { person: (typeof people)[number]; index: number }>;
    const attendanceValues: (typeof attendance.$inferInsert)[] = [];
    for (const date of dates) {
      studentRows.forEach((student) => {
        const meta = personByEmail[student.email];
        const person = meta.person;
        const index = meta.index;
        let roll = rand();
        if (index === 0) roll *= 0.72;
        if (index === 16 || index === 17) roll = 0.5 + roll * 0.5;
        let status = "Present";
        if (roll > 0.96) status = "Leave";
        else if (roll > 0.9) status = "Half Day";
        else if (roll > 0.8) status = "Absent";
        else if (roll > 0.7) status = "Late";
        const subject =
          person[2] === "MCA" && person[3] === 3
            ? subjectByCode[["MCA301", "MCA302", "MCA303"][index % 3]]
            : person[2] === "CSE"
              ? subjectByCode.CSE401
              : person[2] === "IT" && person[3] === 3
                ? subjectByCode.IT305
                : null;
        const deviceId = person[2] === "CSE" && rand() > 0.5 ? "NODEMCU-03" : rand() > 0.72 ? "NODEMCU-02" : "NODEMCU-01";
        let entryTime: Date | null = null;
        let exitTime: Date | null = null;
        if (status === "Present") {
          entryTime = at(date, 8, pick(35, 58));
          exitTime = at(date, 16, pick(0, 40));
        } else if (status === "Late") {
          entryTime = at(date, 9, pick(18, 55));
          exitTime = at(date, 16, pick(10, 50));
        } else if (status === "Half Day") {
          entryTime = at(date, 9, pick(0, 20));
          exitTime = at(date, 12, pick(10, 40));
        }
        attendanceValues.push({
          studentId: student.id,
          rfidUid: student.rfidUid,
          subjectId: subject?.id ?? null,
          teacherId: subject?.teacherId ?? null,
          date,
          entryTime,
          exitTime,
          status,
          scanType: entryTime ? "EXIT" : null,
          deviceId: status === "Absent" || status === "Leave" ? null : deviceId,
        });
      });
    }

    const today = todayKolkata();
    const todayPattern = ["Present", "Present", "Late", "Present", "Present", "Present", "Late", "Half Day", "Present", "Present", "Leave", "Present"];
    const eligibleToday = studentRows.filter((student) => student.studentCode !== "CU12345");
    todayPattern.forEach((status, offset) => {
      const student = eligibleToday[offset];
      if (!student) return;
      const person = personByEmail[student.email].person;
      const subject = person[2] === "MCA" ? subjectByCode.MCA301 : person[2] === "CSE" ? subjectByCode.CSE401 : person[2] === "IT" ? subjectByCode.IT305 : null;
      const entryTime = status === "Late" ? at(today, 9, 28) : status === "Leave" || status === "Absent" ? null : at(today, 8, 50 + (offset % 8));
      const exitTime = status === "Half Day" ? at(today, 12, 20) : null;
      attendanceValues.push({
        studentId: student.id,
        rfidUid: student.rfidUid,
        subjectId: subject?.id ?? null,
        teacherId: subject?.teacherId ?? null,
        date: today,
        entryTime,
        exitTime,
        status,
        scanType: exitTime ? "EXIT" : entryTime ? "ENTRY" : null,
        deviceId: entryTime ? "NODEMCU-01" : null,
      });
    });

    const attendanceRows = [];
    for (let i = 0; i < attendanceValues.length; i += 80) {
      const chunk = await tx.insert(attendance).values(attendanceValues.slice(i, i + 80)).returning();
      attendanceRows.push(...chunk);
    }

    const scanSource = attendanceRows.filter((row) => row.date === today && row.entryTime).slice(0, 8);
    if (scanSource.length) {
      await tx.insert(rfidScans).values(
        scanSource.map((row) => ({
          rfidUid: row.rfidUid || "00 00 00 00",
          deviceId: row.deviceId,
          studentId: row.studentId,
          success: true,
          message: row.exitTime ? "Exit recorded" : "Entry recorded",
          scanType: row.scanType,
          status: row.status,
          createdAt: row.exitTime ?? row.entryTime ?? new Date(),
        })),
      );
    }
    await tx.insert(rfidScans).values({
      rfidUid: "DE AD BE EF",
      deviceId: "NODEMCU-01",
      success: false,
      message: "RFID card is not registered",
      createdAt: new Date(now.getTime() - 25 * 60_000),
    });

    if (attendanceRows[3]) {
      await tx.insert(attendanceLogs).values({
        attendanceId: attendanceRows[3].id,
        action: "CORRECT",
        performedBy: admin.id,
        oldValue: { status: "Absent" },
        newValue: { status: attendanceRows[3].status },
      });
    }

    await tx.insert(notifications).values([
      {
        userId: admin.id,
        title: "NODEMCU-03 is offline",
        message: "CS Lab RFID has not checked in since the last lab session.",
        type: "warning",
      },
      {
        userId: admin.id,
        title: "Unknown RFID card detected",
        message: "Unknown RFID card DE AD BE EF was scanned at NODEMCU-01.",
        type: "danger",
      },
      {
        userId: userByEmail["student@smartattend.com"].id,
        title: "RFID card registered successfully.",
        message: "Card A3 7F 21 9C is linked to CU12345.",
        type: "success",
      },
      {
        userId: userByEmail["student@smartattend.com"].id,
        title: "Welcome to SmartAttend",
        message: "Your MCA attendance record is live. Tap your card at Main Gate to mark entry and exit.",
        type: "info",
      },
      {
        userId: userByEmail["harsh.malhotra@crestview.edu"].id,
        title: "Your attendance is below 75%.",
        message: "Please review your attendance history and meet your course coordinator.",
        type: "warning",
      },
    ]);
  });
}
