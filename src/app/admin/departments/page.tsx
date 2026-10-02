"use client";

import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { Field, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Department = { id: number; name: string; code: string };
type Course = { id: number; name: string; code: string; departmentId: number };
type Semester = { id: number; courseId: number; number: number; name: string };
type Section = { id: number; courseId: number; semesterNumber: number; name: string };

export default function DepartmentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [department, setDepartment] = useState({ name: "", code: "" });
  const [course, setCourse] = useState({ name: "", code: "", departmentId: "" });
  const [semester, setSemester] = useState({ courseId: "", number: "1", name: "" });
  const [section, setSection] = useState({ courseId: "", semesterNumber: "1", name: "A" });

  async function load() {
    const res = await api<{ departments: Department[]; courses: Course[]; semesters: Semester[]; sections: Section[] }>("/api/departments");
    setDepartments(res.departments);
    setCourses(res.courses);
    setSemesters(res.semesters);
    setSections(res.sections);
  }
  useEffect(() => {
    const id = setTimeout(() => {
      load().catch((error) => toast.error(error.message));
    }, 0);
    return () => clearTimeout(id);
  }, [toast]);

  async function run(work: () => Promise<unknown>, message: string) {
    try {
      await work();
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Request failed");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Academic structure" title="Departments" subtitle="Departments, courses, semesters and sections used by registration and attendance filters." />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Departments</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <Field label="Name"><input className="field" value={department.name} onChange={(e) => setDepartment({ ...department, name: e.target.value })} /></Field>
            <Field label="Code"><input className="field" value={department.code} onChange={(e) => setDepartment({ ...department, code: e.target.value.toUpperCase() })} /></Field>
            <button className="btn btn-primary self-end" onClick={() => run(() => api("/api/departments", { method: "POST", body: JSON.stringify(department) }), "Department created.")}>Add</button>
          </div>
          <ul className="mt-4 space-y-2">{departments.map((item) => <li key={item.id} className="flex items-center justify-between rounded-2xl bg-sand px-3 py-2 text-sm"><span><b>{item.code}</b> · {item.name}</span><button className="text-rose-700" onClick={async () => { if (await confirm({ title: "Delete department?", message: item.name, danger: true, confirmLabel: "Delete" })) run(() => api(`/api/departments/${item.id}`, { method: "DELETE" }), "Department deleted."); }}>Delete</button></li>)}</ul>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Courses</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Course"><input className="field" value={course.name} onChange={(e) => setCourse({ ...course, name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Code"><input className="field" value={course.code} onChange={(e) => setCourse({ ...course, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Department"><select className="field" value={course.departmentId} onChange={(e) => setCourse({ ...course, departmentId: e.target.value })}><option value="">Select</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></Field>
            </div>
            <button className="btn btn-primary" onClick={() => run(() => api("/api/courses", { method: "POST", body: JSON.stringify({ ...course, departmentId: Number(course.departmentId) }) }), "Course created.")}>Add course</button>
          </div>
          <ul className="mt-4 space-y-2">{courses.map((item) => <li key={item.id} className="flex items-center justify-between rounded-2xl bg-sand px-3 py-2 text-sm"><span>{item.code} · {item.name}</span><button className="text-rose-700" onClick={() => run(() => api(`/api/courses/${item.id}`, { method: "DELETE" }), "Course deleted.")}>Delete</button></li>)}</ul>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Semesters</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Course"><select className="field" value={semester.courseId} onChange={(e) => setSemester({ ...semester, courseId: e.target.value })}><option value="">Select</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></Field>
            <Field label="Number"><input className="field" type="number" value={semester.number} onChange={(e) => setSemester({ ...semester, number: e.target.value })} /></Field>
            <button className="btn btn-primary self-end" onClick={() => run(() => api("/api/semesters", { method: "POST", body: JSON.stringify({ courseId: Number(semester.courseId), number: Number(semester.number), name: semester.name || `Semester ${semester.number}` }) }), "Semester created.")}>Add</button>
          </div>
          <ul className="mt-4 max-h-64 space-y-2 overflow-auto">{semesters.map((item) => <li key={item.id} className="flex justify-between rounded-2xl bg-sand px-3 py-2 text-sm"><span>{courses.find((courseItem) => courseItem.id === item.courseId)?.code} · {item.name}</span><button className="text-rose-700" onClick={() => run(() => api(`/api/semesters/${item.id}`, { method: "DELETE" }), "Semester deleted.")}>Delete</button></li>)}</ul>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Sections</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Course"><select className="field" value={section.courseId} onChange={(e) => setSection({ ...section, courseId: e.target.value })}><option value="">Select</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></Field>
            <Field label="Semester"><input className="field" type="number" value={section.semesterNumber} onChange={(e) => setSection({ ...section, semesterNumber: e.target.value })} /></Field>
            <Field label="Section"><input className="field" value={section.name} onChange={(e) => setSection({ ...section, name: e.target.value.toUpperCase() })} /></Field>
            <button className="btn btn-primary self-end" onClick={() => run(() => api("/api/sections", { method: "POST", body: JSON.stringify({ courseId: Number(section.courseId), semesterNumber: Number(section.semesterNumber), name: section.name }) }), "Section created.")}>Add</button>
          </div>
          <ul className="mt-4 max-h-64 space-y-2 overflow-auto">{sections.map((item) => <li key={item.id} className="flex justify-between rounded-2xl bg-sand px-3 py-2 text-sm"><span>{courses.find((courseItem) => courseItem.id === item.courseId)?.code} Sem {item.semesterNumber}{item.name}</span><button className="text-rose-700" onClick={() => run(() => api(`/api/sections/${item.id}`, { method: "DELETE" }), "Section deleted.")}>Delete</button></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
