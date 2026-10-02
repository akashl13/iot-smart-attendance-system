"use client";

import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { DataTable, Field, Modal, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Teacher = { id: number; teacherId: string; name: string; email: string; departmentId: number; department: string; subjects: string[] };
type Dept = { id: number; name: string };

export default function TeachersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [view, setView] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ teacherId: "", name: "", email: "", departmentId: "" });

  async function load() {
    const [teacherRes, deptRes] = await Promise.all([api<{ data: Teacher[] }>("/api/teachers"), api<{ departments: Dept[] }>("/api/departments")]);
    setRows(teacherRes.data);
    setDepartments(deptRes.departments);
  }
  useEffect(() => {
    const id = setTimeout(() => { void load().catch((error) => toast.error(error.message)); }, 0);
    return () => clearTimeout(id);
  }, [toast]);

  async function save() {
    try {
      const payload = { ...form, departmentId: Number(form.departmentId) };
      if (editing) await api(`/api/teachers/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/teachers", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Teacher saved.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    }
  }

  async function remove(row: Teacher) {
    const ok = await confirm({ title: "Delete teacher?", message: "Assigned subjects will keep their records but lose this teacher.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await api(`/api/teachers/${row.id}`, { method: "DELETE" });
    toast.success("Teacher deleted.");
    await load();
  }

  return (
    <div>
      <PageHeader eyebrow="Faculty" title="Teachers" subtitle="Teacher accounts are managed by the registrar in this release. A faculty portal can be added later without changing subject assignment." action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ teacherId: "", name: "", email: "", departmentId: "" }); setOpen(true); }}>Add teacher</button>} />
      <div className="panel p-4">
        <DataTable rows={rows as unknown as Record<string, unknown>[]} columns={[
          { key: "teacherId", label: "Teacher ID" },
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "department", label: "Department" },
          { key: "subjects", label: "Subjects", render: (row) => ((row.subjects as string[]) || []).join(", ") || "—" },
          { key: "actions", label: "Actions", render: (row) => {
            const item = row as unknown as Teacher;
            return <div className="flex gap-2"><button className="btn btn-ghost px-3 py-2" onClick={() => setView(item)}>View</button><button className="btn btn-ghost px-3 py-2" onClick={() => { setEditing(item.id); setForm({ teacherId: item.teacherId, name: item.name, email: item.email, departmentId: String(item.departmentId) }); setOpen(true); }}>Edit</button><button className="btn btn-ghost px-3 py-2" onClick={() => remove(item)}>Delete</button></div>;
          } },
        ]} />
      </div>
      <Modal open={open} title={editing ? "Edit teacher" : "Add teacher"} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <Field label="Teacher ID"><input className="field" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value.toUpperCase() })} /></Field>
          <Field label="Name"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Department"><select className="field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        </div>
        <button className="btn btn-primary mt-5" onClick={save}>Save teacher</button>
      </Modal>
      <Modal open={Boolean(view)} title={view?.name || "Teacher"} onClose={() => setView(null)}>
        {view && <div className="space-y-2 text-sm"><p>{view.teacherId}</p><p>{view.email}</p><p>{view.department}</p><p>Subjects: {view.subjects.join(", ") || "None"}</p></div>}
      </Modal>
    </div>
  );
}
