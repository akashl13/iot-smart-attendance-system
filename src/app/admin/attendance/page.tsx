"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2, Eye, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { DataTable, Field, LoadingState, Modal, PageHeader, Pagination, SearchBar, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";
import { todayKolkata } from "@/lib/format";

type Row = { id: number; studentId: string; studentName: string; studentDbId: number; department: string; date: string; entry: string; exit: string; status: string; deviceId: string | null; subjectId: number | null; subject: string };
type Catalog = { departments: { id: number; name: string; code: string }[]; courses: { id: number; name: string }[] };
type Subject = { id: number; subjectName: string };
type Student = { id: number; studentId: string; name: string };

const blank = { studentId: "", date: todayKolkata(), status: "Present", entryTime: "09:00", exitTime: "", subjectId: "", deviceId: "NODEMCU-01" };

export default function AttendancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");
  const [studentId, setStudentId] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("studentId") || ""));
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(blank);
  const [logs, setLogs] = useState<{ id: number; action: string; performedBy: string | null; timestamp: string }[]>([]);
  const [viewing, setViewing] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Catalog>("/api/departments"),
      api<{ data: Subject[] }>("/api/subjects"),
      api<{ data: Student[] }>("/api/students?limit=50"),
    ]).then(([cat, subjectRes, studentRes]) => {
      if (cancelled) return;
      setCatalog(cat);
      setSubjects(subjectRes.data);
      setStudents(studentRes.data);
    }).catch((error) => { if (!cancelled) toast.error(error.message); });
    return () => { cancelled = true; };
  }, [toast]);

  async function load(next = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(next), limit: "10", search, date, departmentId, courseId, subjectId, status, studentId });
    const res = await api<{ data: Row[]; pages: number }>(`/api/attendance?${params}`);
    setRows(res.data);
    setPages(res.pages);
    setLoading(false);
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;
      await load(page);
    })().catch((error) => { if (!cancelled) toast.error(error.message); });
    return () => { cancelled = true; };
  }, [page, search, date, departmentId, courseId, subjectId, status, studentId]);

  async function save() {
    const payload = { ...form, studentId: form.studentId, subjectId: form.subjectId ? Number(form.subjectId) : null, exitTime: form.exitTime || null };
    try {
      if (editing) await api(`/api/attendance/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/attendance", { method: "POST", body: JSON.stringify(payload) });
      toast.success(editing ? "Attendance updated." : "Attendance record created.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save attendance");
    }
  }

  async function remove(row: Row) {
    const ok = await confirm({ title: "Delete attendance?", message: `Remove ${row.studentName}'s record for ${row.date}? This is logged before deletion.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await api(`/api/attendance/${row.id}`, { method: "DELETE" });
    toast.success("Attendance record deleted.");
    await load();
  }

  async function view(row: Row) {
    const res = await api<{ logs: typeof logs }>(`/api/attendance/${row.id}`);
    setLogs(res.logs);
    setViewing(row);
  }

  async function markAbsent() {
    const ok = await confirm({ title: "Mark unmarked students absent?", message: `Create absent records for ${date || "today"} where no attendance exists.`, confirmLabel: "Mark absent" });
    if (!ok) return;
    const res = await api<{ message: string }>("/api/attendance/mark-absent", { method: "POST", body: JSON.stringify({ date: date || todayKolkata(), departmentId: departmentId ? Number(departmentId) : undefined }) });
    toast.success(res.message);
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Records"
        title="Attendance"
        subtitle="Filter the ledger, correct a record, or mark the remaining roster absent. Students cannot call these write routes."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/attendance/live"
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-500/20 text-white flex items-center gap-2"
            >
              <Radio size={16} className="animate-pulse" /> Start Live Attendance
            </Link>
            <button className="btn btn-ghost" onClick={markAbsent}>
              Mark absent
            </button>
            <button
              className="btn btn-ghost border border-slate-200"
              onClick={() => {
                setEditing(null);
                setForm({ ...blank, date: date || todayKolkata() });
                setOpen(true);
              }}
            >
              <Plus size={16} /> Add record
            </button>
          </div>
        }
      />
      <div className="panel p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SearchBar value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Student or device" />
          <input className="field" type="date" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} />
          <input className="field" value={studentId} onChange={(e) => { setPage(1); setStudentId(e.target.value.toUpperCase()); }} placeholder="Student ID" />
          <select className="field" value={departmentId} onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }}><option value="">Department</option>{catalog?.departments.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
          <select className="field" value={courseId} onChange={(e) => { setPage(1); setCourseId(e.target.value); }}><option value="">Course</option>{catalog?.courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="field" value={subjectId} onChange={(e) => { setPage(1); setSubjectId(e.target.value); }}><option value="">Subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select>
          <select className="field" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">Status</option>{["Present", "Late", "Absent", "Half Day", "Leave"].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {loading ? <LoadingState /> : <DataTable rows={rows as unknown as Record<string, unknown>[]} columns={[
          { key: "studentId", label: "Student ID" },
          { key: "studentName", label: "Student" },
          { key: "department", label: "Department" },
          { key: "date", label: "Date" },
          { key: "entry", label: "Entry" },
          { key: "exit", label: "Exit" },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: "deviceId", label: "Device" },
          { key: "actions", label: "Actions", render: (row) => {
            const item = row as unknown as Row;
            return <div className="flex gap-1">
              <button className="btn btn-ghost px-2 py-2" onClick={() => view(item)}><Eye size={15} /></button>
              <button className="btn btn-ghost px-2 py-2" onClick={() => { setEditing(item.id); setForm({ studentId: String(item.studentDbId), date: item.date, status: item.status, entryTime: item.entry === "—" ? "" : to24(item.entry), exitTime: item.exit === "—" ? "" : to24(item.exit), subjectId: item.subjectId ? String(item.subjectId) : "", deviceId: item.deviceId || "" }); setOpen(true); }}><Pencil size={15} /></button>
              <button className="btn btn-ghost px-2 py-2" onClick={() => remove(item)}><Trash2 size={15} /></button>
            </div>;
          } },
        ]} />}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
      <Modal open={open} title={editing ? "Correct attendance" : "Add attendance"} onClose={() => setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student"><select className="field" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}><option value="">Select</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentId} · {student.name}</option>)}</select></Field>
          <Field label="Date"><input className="field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Status"><select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Present", "Late", "Absent", "Half Day", "Leave"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Subject"><select className="field" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">None</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select></Field>
          <Field label="Entry"><input className="field" type="time" value={form.entryTime} onChange={(e) => setForm({ ...form, entryTime: e.target.value })} /></Field>
          <Field label="Exit"><input className="field" type="time" value={form.exitTime} onChange={(e) => setForm({ ...form, exitTime: e.target.value })} /></Field>
          <Field label="Device"><input className="field" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end"><button className="btn btn-primary" onClick={save}>Save correction</button></div>
      </Modal>
      <Modal open={Boolean(viewing)} title="Attendance detail" onClose={() => setViewing(null)}>
        {viewing && <p className="text-sm">{viewing.studentName} · {viewing.date} · {viewing.status}</p>}
        <div className="mt-4 space-y-2">
          {logs.map((log) => <div key={log.id} className="rounded-2xl bg-sand px-3 py-2 text-sm"><p className="font-semibold">{log.action}</p><p className="text-slate-500">{log.performedBy || "System"} · {log.timestamp}</p></div>)}
          {!logs.length && <p className="text-sm text-slate-500">No modification log yet.</p>}
        </div>
      </Modal>
    </div>
  );
}

function to24(value: string) {
  if (!value || value === "—") return "";
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return value.slice(0, 5);
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
