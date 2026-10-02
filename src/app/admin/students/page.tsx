"use client";

import {
  CalendarCheck,
  Check,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { RFIDScannerCard } from "@/components/rfid-scanner";
import {
  DataTable,
  Field,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  StatusBadge,
} from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Student = {
  id: number;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  departmentId: number;
  course: string;
  courseId: number;
  semester: number;
  section: string;
  rfid: string | null;
  rfidStatus: string;
  attendance: number;
  status: string;
  enrollmentNumber: string;
  gender?: string;
  dateOfBirth?: string;
};

type Catalog = {
  departments: { id: number; name: string; code: string }[];
  courses: { id: number; name: string; departmentId: number }[];
  semesters: { courseId: number; number: number; name: string }[];
  sections: { courseId: number; semesterNumber: number; name: string }[];
};

const blank = {
  name: "",
  studentId: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "Male",
  departmentId: "",
  courseId: "",
  semester: "1",
  section: "A",
  enrollmentNumber: "",
  password: "Student@123",
  status: "ACTIVE",
  rfidUID: "",
};

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colors = [
    "from-indigo-500 to-indigo-600 text-white",
    "from-emerald-500 to-emerald-600 text-white",
    "from-violet-500 to-violet-600 text-white",
    "from-cyan-500 to-cyan-600 text-white",
    "from-amber-500 to-amber-600 text-white",
  ];
  const colorIndex = (name.charCodeAt(0) || 0) % colors.length;
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${colors[colorIndex]} text-xs font-bold shadow-sm`}
    >
      {initials || "ST"}
    </span>
  );
}

function AttendanceProgress({ percentage }: { percentage: number }) {
  const isGood = percentage >= 75;
  const isFair = percentage >= 60;
  const color = isGood ? "bg-emerald-500" : isFair ? "bg-amber-500" : "bg-rose-500";
  const textColor = isGood ? "text-emerald-700" : isFair ? "text-amber-700" : "text-rose-700";
  return (
    <div className="w-28 space-y-1">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className={textColor}>{percentage}%</span>
        <span className="text-[10px] text-slate-400 font-medium">{isGood ? "Good" : isFair ? "Fair" : "Low"}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [rows, setRows] = useState<Student[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "UNASSIGNED" | "LOW_ATTENDANCE">("ALL");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"add" | "edit" | "view" | "rfid" | null>(null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [form, setForm] = useState(blank);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detectingHardware, setDetectingHardware] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: "8",
      search,
      departmentId,
      status: activeTab === "ACTIVE" ? "ACTIVE" : status,
    });
    try {
      const res = await api<{ data: Student[]; pages: number }>(`/api/students?${params}`);
      let filtered = res.data;
      if (activeTab === "UNASSIGNED") {
        filtered = filtered.filter((s) => !s.rfid);
      } else if (activeTab === "LOW_ATTENDANCE") {
        filtered = filtered.filter((s) => s.attendance < 75);
      }
      setRows(filtered);
      setPages(res.pages);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api<Catalog & { success: boolean }>("/api/departments")
      .then(setCatalog)
      .catch((error) => toast.error(error.message));
  }, [toast]);

  useEffect(() => {
    const id = setTimeout(() => { void load(page).catch((error) => toast.error(error.message)); }, 0);
    return () => clearTimeout(id);
  }, [page, search, departmentId, status, activeTab]);

  function openAdd() {
    const defaultDept = catalog?.departments[0]?.id ? String(catalog.departments[0].id) : "";
    const availableCourses = catalog?.courses.filter((c) => String(c.departmentId) === defaultDept) ?? [];
    const defaultCourse = availableCourses[0]?.id ? String(availableCourses[0].id) : "";
    const rand = Math.floor(1000 + Math.random() * 9000);

    setForm({
      ...blank,
      departmentId: defaultDept,
      courseId: defaultCourse,
      studentId: `CU${rand}`,
      enrollmentNumber: `ENR${new Date().getFullYear()}${rand}`,
      semester: "1",
      section: "A",
    });
    setMode("add");
  }

  function openEdit(student: Student) {
    setSelected(student);
    setForm({
      ...blank,
      ...student,
      departmentId: String(student.departmentId),
      courseId: String(student.courseId),
      semester: String(student.semester),
      password: "",
      rfidUID: student.rfid || "",
    });
    setMode("edit");
  }

  function handleDepartmentChange(deptId: string) {
    const coursesForDept = catalog?.courses.filter((c) => String(c.departmentId) === deptId) ?? [];
    const firstCourse = coursesForDept[0];
    const courseId = firstCourse ? String(firstCourse.id) : "";
    setForm((prev) => ({
      ...prev,
      departmentId: deptId,
      courseId,
      semester: "1",
      section: "A",
    }));
  }

  function handleCourseChange(courseId: string) {
    setForm((prev) => ({
      ...prev,
      courseId,
      semester: "1",
      section: "A",
    }));
  }

  function autoFillCredentials() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const cleanName = (form.name || "student").toLowerCase().replace(/[^a-z0-9]/g, ".");
    setForm((prev) => ({
      ...prev,
      studentId: prev.studentId || `CU${rand}`,
      enrollmentNumber: prev.enrollmentNumber || `ENR${new Date().getFullYear()}${rand}`,
      email: prev.email || `${cleanName}.${rand}@smartattend.com`,
      phone: prev.phone || `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
    }));
    toast.success("Auto-filled ID, Enrollment, Email & Phone!");
  }

  async function detectLastScannedRfid() {
    setDetectingHardware(true);
    try {
      const res = await api<{ data: { rfidUid: string; studentName: string | null; createdAt: string }[] }>("/api/scans?limit=5");
      const unassigned = res.data.find((s) => !s.studentName) || res.data[0];
      if (unassigned && unassigned.rfidUid) {
        setForm((prev) => ({ ...prev, rfidUID: unassigned.rfidUid }));
        toast.success(`Detected RFID card: ${unassigned.rfidUid}`);
      } else {
        toast.info("No card detected yet. Tap your RFID card on the reader!");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not fetch scanner history");
    } finally {
      setDetectingHardware(false);
    }
  }

  async function generateTestUid() {
    setScanning(true);
    try {
      const res = await api<{ rfidUID: string }>("/api/rfid/next-uid");
      setForm((current) => ({ ...current, rfidUID: res.rfidUID }));
      toast.success(`Generated UID: ${res.rfidUID}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "UID generation failed");
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Please enter student name.");
    if (!form.studentId.trim()) return toast.error("Please enter Student ID.");
    if (!form.email.trim()) return toast.error("Please enter email address.");
    if (!form.departmentId) return toast.error("Please select a department.");
    if (!form.courseId) return toast.error("Please select a course.");

    const payload = {
      ...form,
      departmentId: Number(form.departmentId),
      courseId: Number(form.courseId),
      semester: Number(form.semester),
    };

    try {
      if (mode === "add") {
        await api("/api/students", { method: "POST", body: JSON.stringify(payload) });
      } else if (selected) {
        await api(`/api/students/${selected.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      toast.success(mode === "add" ? "Student registered successfully!" : "Student details updated!");
      setMode(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    }
  }

  async function remove(student: Student) {
    const ok = await confirm({
      title: "Delete Student?",
      message: `Are you sure you want to remove ${student.name} (${student.studentId})? All attendance history will be deleted.`,
      confirmLabel: "Delete Student",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/students/${student.id}`, { method: "DELETE" });
      toast.success("Student removed successfully.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  }

  async function view(student: Student) {
    setSelected(student);
    try {
      const res = await api<{ student: Record<string, unknown> }>(`/api/students/${student.id}`);
      setDetail(res.student);
      setMode("view");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load student profile");
    }
  }

  async function saveRfid() {
    if (!selected || !form.rfidUID) return;
    try {
      await api("/api/rfid/register", { method: "POST", body: JSON.stringify({ rfidUID: form.rfidUID, studentId: selected.id }) });
      toast.success("RFID card assigned successfully!");
      setMode(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "RFID registration failed");
    }
  }

  async function clearRfid(student: Student) {
    if (!student.rfid) return;
    const ok = await confirm({
      title: "Unassign RFID Card?",
      message: `Unassign card ${student.rfid} from ${student.name}. The card can then be assigned to someone else.`,
      confirmLabel: "Unassign Card",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/rfid/${encodeURIComponent(student.rfid)}`, { method: "PUT", body: JSON.stringify({ status: "UNASSIGNED", studentId: null }) });
      toast.success("RFID card unassigned.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not unassign RFID");
    }
  }

  const courses = catalog?.courses.filter((course) => String(course.departmentId) === form.departmentId) ?? [];
  const semesters = catalog?.semesters.filter((semester) => String(semester.courseId) === form.courseId) ?? [];
  const sections = catalog?.sections.filter((section) => String(section.courseId) === form.courseId && String(section.semesterNumber) === form.semester) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roster Management"
        title="Students & RFID"
        subtitle="Manage enrolled students, assign physical RFID smart cards, and track attendance performance."
        action={
          <button className="btn btn-tide" onClick={openAdd}>
            <Plus size={17} /> Add New Student
          </button>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="panel p-5 space-y-4">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => { setPage(1); setActiveTab("ALL"); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ALL" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Students
          </button>
          <button
            onClick={() => { setPage(1); setActiveTab("ACTIVE"); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ACTIVE" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => { setPage(1); setActiveTab("UNASSIGNED"); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "UNASSIGNED" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100"
            }`}
          >
            <CreditCard size={13} /> Needs RFID Card
          </button>
          <button
            onClick={() => { setPage(1); setActiveTab("LOW_ATTENDANCE"); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "LOW_ATTENDANCE" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-800 border border-rose-200/60 hover:bg-rose-100"
            }`}
          >
            Low Attendance (&lt; 75%)
          </button>
        </div>

        {/* Search & Department Dropdown */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBar
            value={search}
            onChange={(value) => { setPage(1); setSearch(value); }}
            placeholder="Search by name, student code, email, or RFID hex..."
          />
          <select
            className="field sm:max-w-64"
            value={departmentId}
            onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }}
          >
            <option value="">All Departments</option>
            {catalog?.departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState label="Loading students roster" />
        ) : (
          <DataTable
            rows={rows as unknown as Record<string, unknown>[]}
            columns={[
              {
                key: "student",
                label: "Student",
                render: (row) => {
                  const student = row as unknown as Student;
                  return (
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={student.name} />
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight flex items-center gap-2">
                          <span>{student.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200/60">
                            {student.studentId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{student.email}</div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "academic",
                label: "Department & Program",
                render: (row) => {
                  const student = row as unknown as Student;
                  return (
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{student.department}</div>
                      <div className="text-[11px] text-slate-500">
                        {student.course} · Sem {student.semester}
                        <span className="font-semibold text-slate-700"> ({student.section})</span>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "rfid",
                label: "RFID Card",
                render: (row) => {
                  const student = row as unknown as Student;
                  if (student.rfid) {
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200/70 px-2 py-1 font-mono text-xs font-semibold text-indigo-700">
                        <CreditCard size={13} className="text-indigo-500" />
                        {student.rfid}
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={() => {
                        setSelected(student);
                        setForm({ ...blank, rfidUID: "" });
                        setMode("rfid");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/80 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Plus size={12} /> Assign Card
                    </button>
                  );
                },
              },
              {
                key: "attendance",
                label: "Attendance",
                render: (row) => {
                  const student = row as unknown as Student;
                  return <AttendanceProgress percentage={student.attendance} />;
                },
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={String(row.status)} />,
              },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                render: (row) => {
                  const student = row as unknown as Student;
                  return (
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn btn-ghost px-2.5 py-1.5 text-xs"
                        onClick={() => view(student)}
                        title="View profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="btn btn-ghost px-2.5 py-1.5 text-xs"
                        onClick={() => openEdit(student)}
                        title="Edit student"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-ghost px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-700"
                        onClick={() => router.push(`/admin/attendance?studentId=${student.studentId}`)}
                        title="View attendance record"
                      >
                        <CalendarCheck size={15} />
                      </button>
                      {student.rfid && (
                        <button
                          className="btn btn-ghost px-2.5 py-1.5 text-xs text-amber-600 hover:text-amber-700"
                          onClick={() => clearRfid(student)}
                          title="Unassign RFID card"
                        >
                          <CreditCard size={15} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => remove(student)}
                        title="Delete student"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        open={mode === "add" || mode === "edit"}
        title={mode === "add" ? "Enroll New Student" : "Update Student Details"}
        subtitle={mode === "add" ? "Register a student and link an RFID card for automated gate & classroom attendance." : `Editing record for ${selected?.name || "student"}.`}
        onClose={() => setMode(null)}
        wide
      >
        <div className="space-y-6">
          {mode === "add" && (
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 border border-indigo-100 p-3.5">
              <div className="flex items-center gap-2.5 text-xs text-indigo-900 font-medium">
                <Sparkles size={16} className="text-indigo-600 shrink-0" />
                <span>Need a quick test student? Auto-fill code, email, enrollment, and phone number.</span>
              </div>
              <button
                type="button"
                onClick={autoFillCredentials}
                className="btn btn-ghost bg-white text-xs px-3 py-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0"
              >
                ⚡ Auto-Fill Helpers
              </button>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1. Personal & Contact Details</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name *">
                <input
                  className="field"
                  placeholder="e.g. Akashdeep Singh"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Student ID / Code *">
                <input
                  className="field font-mono uppercase"
                  placeholder="e.g. CU12345"
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Email Address *">
                <input
                  className="field"
                  type="email"
                  placeholder="student@university.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone Number *">
                <input
                  className="field"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <select
                  className="field"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input
                  className="field"
                  type="date"
                  value={form.dateOfBirth || ""}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Academic Program */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">2. Academic Enrollment</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department *">
                <select
                  className="field"
                  value={form.departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {catalog?.departments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Course / Program *">
                <select
                  className="field"
                  value={form.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Semester">
                <select
                  className="field"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                >
                  {semesters.length > 0 ? (
                    semesters.map((item) => (
                      <option key={item.number} value={item.number}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    [1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="Section">
                <select
                  className="field"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                >
                  {sections.length > 0 ? (
                    sections.map((item) => (
                      <option key={item.name} value={item.name}>
                        Section {item.name}
                      </option>
                    ))
                  ) : (
                    ["A", "B", "C", "D"].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="University Enrollment No. *">
                <input
                  className="field font-mono uppercase"
                  placeholder="e.g. ENR20261021"
                  value={form.enrollmentNumber}
                  onChange={(e) => setForm({ ...form, enrollmentNumber: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Section 3: RFID Smart Card & Security */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">3. RFID Smart Card & Security</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="RFID Card UID (Optional)" hint="e.g. A3 7F 21 9C">
                  <div className="flex gap-2">
                    <input
                      className="field font-mono uppercase"
                      placeholder="XX XX XX XX"
                      value={form.rfidUID}
                      onChange={(e) => setForm({ ...form, rfidUID: e.target.value.toUpperCase() })}
                    />
                    <button
                      type="button"
                      onClick={detectLastScannedRfid}
                      disabled={detectingHardware}
                      className="btn btn-ghost px-3 py-1.5 text-xs font-semibold shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      title="Read latest card scanned on physical hardware"
                    >
                      {detectingHardware ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                      Detect Tap
                    </button>
                    <button
                      type="button"
                      onClick={generateTestUid}
                      disabled={scanning}
                      className="btn btn-ghost px-2.5 py-1.5 text-xs shrink-0"
                      title="Generate random test UID"
                    >
                      Rand
                    </button>
                  </div>
                </Field>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Tap your RFID card on your RC522 scanner, then click <strong>Detect Tap</strong> to auto-fill.
                </p>
              </div>
              <Field label="Student Portal Password" hint="Initial login password">
                <input
                  className="field"
                  type="password"
                  placeholder={mode === "edit" ? "Leave blank to keep current" : "Student@123"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button className="btn btn-ghost" onClick={() => setMode(null)}>
            Cancel
          </button>
          <button className="btn btn-tide" onClick={save}>
            <Check size={16} /> {mode === "add" ? "Save Student" : "Update Student"}
          </button>
        </div>
      </Modal>

      {/* Student Record View Modal */}
      <Modal open={mode === "view"} title="Student Profile" onClose={() => setMode(null)}>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-2xl font-bold backdrop-blur-md border border-white/20">
                {String(detail.name || "").slice(0, 1)}
              </span>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">{String(detail.name)}</h3>
                <p className="text-sm text-indigo-200/80 font-mono mt-0.5">{String(detail.studentId)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur-md">
                    {String(detail.course)}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/80">
                    Sem {String(detail.semester)} ({String(detail.section)})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4 text-sm bg-slate-50/50">
              <div>
                <span className="text-xs text-slate-500 font-medium">Department</span>
                <p className="font-semibold text-slate-800">{String(detail.department)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">University Enrollment</span>
                <p className="font-semibold font-mono text-slate-800">{String(detail.enrollmentNumber || "—")}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Email Address</span>
                <p className="font-semibold text-slate-800">{String(detail.email)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Phone Number</span>
                <p className="font-semibold text-slate-800">{String(detail.phone)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">RFID Smart Card</span>
                <p className="font-mono font-semibold text-indigo-700">{String(detail.rfidUid || "Unassigned")}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Attendance Rate</span>
                <p className="font-bold text-emerald-700">{String(detail.attendance)}%</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn btn-tide"
                onClick={() => {
                  setMode(null);
                  router.push(`/admin/attendance?studentId=${detail.studentId}`);
                }}
              >
                <CalendarCheck size={16} /> View Attendance Log
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Register RFID Modal */}
      <Modal
        open={mode === "rfid"}
        title="Assign RFID Smart Card"
        subtitle={`Tap a card on the RC522 reader to link it to ${selected?.name || "student"}.`}
        onClose={() => setMode(null)}
      >
        <div className="space-y-4">
          <RFIDScannerCard
            uid={form.rfidUID}
            scanning={scanning}
            onChange={(value) => setForm({ ...form, rfidUID: value })}
            onScan={generateTestUid}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={detectLastScannedRfid}
              disabled={detectingHardware}
              className="btn btn-ghost w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              {detectingHardware ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
              Grab Card From Hardware Scanner
            </button>
          </div>
          <button className="btn btn-tide mt-2 w-full" onClick={saveRfid} disabled={!form.rfidUID}>
            <CreditCard size={16} /> Confirm Card Assignment
          </button>
        </div>
      </Modal>
    </div>
  );
}
