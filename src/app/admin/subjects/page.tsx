"use client";

import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { DataTable, Field, Modal, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Subject = { id: number; subjectCode: string; subjectName: string; departmentId: number; department: string; semester: number; teacherId: number | null; teacher: string | null };
type Dept = { id: number; name: string };
type Teacher = { id: number; name: string; departmentId: number };

export default function SubjectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ subjectName: "", subjectCode: "", departmentId: "", semester: "3", teacherId: "" });

  async function load() {
    const [subjectRes, deptRes, teacherRes] = await Promise.all([
      api<{ data: Subject[] }>("/api/subjects"),
      api<{ departments: Dept[] }>("/api/departments"),
      api<{ data: Teacher[] }>("/api/teachers"),
    ]);
    setRows(subjectRes.data);
    setDepartments(deptRes.departments);
    setTeachers(teacherRes.data);
  }
  useEffect(() => {
    const id = setTimeout(() => { void load().catch((error) => toast.error(error.message)); }, 0);
    return () => clearTimeout(id);
  }, [toast]);

  async function save() {
    const payload = { ...form, departmentId: Number(form.departmentId), semester: Number(form.semester), teacherId: form.teacherId ? Number(form.teacherId) : null };
    try {
      if (editing) await api(`/api/subjects/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/subjects", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Subject saved.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    }
  }

  async function remove(row: Subject) {
    const ok = await confirm({ title: "Delete subject?", message: row.subjectName, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await api(`/api/subjects/${row.id}`, { method: "DELETE" });
    toast.success("Subject deleted.");
    await load();
  }

  return (
    <div>
      <PageHeader eyebrow="Curriculum" title="Subjects" subtitle="Assign a department, semester and teacher. Gate scans use the timetable to pick the current subject." action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ subjectName: "", subjectCode: "", departmentId: "", semester: "3", teacherId: "" }); setOpen(true); }}>Add subject</button>} />
      <div className="panel p-4">
        <DataTable rows={rows as unknown as Record<string, unknown>[]} columns={[
          { key: "subjectCode", label: "Code" },
          { key: "subjectName", label: "Subject" },
          { key: "department", label: "Department" },
          { key: "semester", label: "Semester" },
          { key: "teacher", label: "Teacher" },
          { key: "actions", label: "Actions", render: (row) => {
            const item = row as unknown as Subject;
            return <div className="flex gap-2"><button className="btn btn-ghost px-3 py-2" onClick={() => { setEditing(item.id); setForm({ subjectName: item.subjectName, subjectCode: item.subjectCode, departmentId: String(item.departmentId), semester: String(item.semester), teacherId: item.teacherId ? String(item.teacherId) : "" }); setOpen(true); }}>Edit</button><button className="btn btn-ghost px-3 py-2" onClick={() => remove(item)}>Delete</button></div>;
          } },
        ]} />
      </div>
      <Modal open={open} title={editing ? "Edit subject" : "Add subject"} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <Field label="Subject name"><input className="field" value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} /></Field>
          <Field label="Subject code"><input className="field" value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value.toUpperCase() })} /></Field>
          <Field label="Department"><select className="field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Semester"><input className="field" type="number" min={1} max={10} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></Field>
          <Field label="Teacher"><select className="field" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">Unassigned</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        </div>
        <button className="btn btn-primary mt-5" onClick={save}>Save subject</button>
      </Modal>
    </div>
  );
}
