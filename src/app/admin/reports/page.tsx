"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { Field, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { downloadCsv, downloadPdf } from "@/lib/exporters";
import { todayKolkata } from "@/lib/format";

type Report = { institution: string; title: string; dateRange: string; generatedAt: string; summary: { total: number; present: number; late: number; absent: number; half: number; leave: number; percentage: number }; rows: Record<string, string | number>[] };
type Option = { id: number; name?: string; subjectName?: string; studentId?: string; code?: string };

export default function ReportsPage() {
  const toast = useToast();
  const [type, setType] = useState("daily");
  const [date, setDate] = useState(todayKolkata());
  const [month, setMonth] = useState(todayKolkata().slice(0, 7));
  const [departmentId, setDepartmentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [departments, setDepartments] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ departments: Option[] }>("/api/departments"),
      api<{ data: Option[] }>("/api/subjects"),
      api<{ data: Option[] }>("/api/students?limit=50"),
    ]).then(([dept, subject, student]) => {
      setDepartments(dept.departments);
      setSubjects(subject.data);
      setStudents(student.data);
      if (student.data[0]) setStudentId(String(student.data[0].id));
      if (dept.departments[0]) setDepartmentId(String(dept.departments[0].id));
      if (subject.data[0]) setSubjectId(String(subject.data[0].id));
    }).catch((error) => toast.error(error.message));
  }, [toast]);

  async function generate() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, month, departmentId, subjectId });
      const path = type === "student" ? `/api/reports/student/${studentId}` : `/api/reports/${type}?${params}`;
      const res = await api<{ report: Report }>(path);
      setReport(res.report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate report");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!report) return;
    const summary = report.rows[0] && "percentage" in report.rows[0];
    const head = summary ? ["Student ID", "Student", "Department", "Present", "Absent", "Total", "Percentage"] : ["Student ID", "Student", "Department", "Date", "Subject", "Teacher", "Entry", "Exit", "Status", "Device"];
    const body = report.rows.map((row) => summary
      ? [row.studentId, row.studentName, row.department, row.present, row.absent, row.total, row.percentage]
      : [row.studentId, row.studentName, row.department, row.date, row.subject, row.teacher, row.entryTime, row.exitTime, row.status, row.deviceId]);
    downloadCsv(`${type}-attendance.csv`, [head, ...body]);
  }

  function exportPdf() {
    if (!report) return;
    const summary = report.rows[0] && "percentage" in report.rows[0];
    const head = summary ? ["Student ID", "Student", "Department", "Present", "Absent", "Total", "%"] : ["ID", "Student", "Dept", "Date", "Subject", "Entry", "Exit", "Status", "Device"];
    const body = report.rows.map((row) => summary
      ? [row.studentId, row.studentName, row.department, row.present, row.absent, row.total, row.percentage]
      : [row.studentId, row.studentName, row.department, row.date, row.subject, row.entryTime, row.exitTime, row.status, row.deviceId]);
    downloadPdf({
      filename: `${type}-attendance.pdf`,
      institution: report.institution,
      title: report.title,
      subtitle: `${report.dateRange} · Generated ${report.generatedAt}`,
      summary: `Present ${report.summary.present} · Late ${report.summary.late} · Absent ${report.summary.absent} · Half day ${report.summary.half} · Leave ${report.summary.leave} · ${report.summary.percentage}%`,
      head,
      body: body as (string | number)[][],
    });
  }

  return (
    <div>
      <PageHeader eyebrow="Exports" title="Reports" subtitle="Daily, monthly, student, department and subject reports are generated from stored attendance." />
      <section className="panel grid gap-4 p-5 md:grid-cols-4">
        <Field label="Report"><select className="field" value={type} onChange={(e) => setType(e.target.value)}><option value="daily">Daily attendance</option><option value="monthly">Monthly attendance</option><option value="student">Student attendance</option><option value="department">Department attendance</option><option value="subject">Subject attendance</option></select></Field>
        {type === "daily" && <Field label="Date"><input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
        {type !== "daily" && type !== "student" && <Field label="Month"><input className="field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>}
        {(type === "daily" || type === "department" || type === "monthly") && <Field label="Department"><select className="field" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>{departments.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></Field>}
        {type === "subject" && <Field label="Subject"><select className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select></Field>}
        {type === "student" && <Field label="Student"><select className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)}>{students.map((item) => <option key={item.id} value={item.id}>{item.studentId} · {item.name}</option>)}</select></Field>}
        <div className="flex items-end"><button className="btn btn-primary w-full" onClick={generate}>Generate</button></div>
      </section>
      {loading && <div className="mt-4"><LoadingState label="Building report" /></div>}
      {report && !loading && (
        <section className="panel mt-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-tide">{report.institution}</p>
              <h2 className="font-display text-4xl">{report.title}</h2>
              <p className="text-sm text-slate-500">{report.dateRange} · {report.generatedAt}</p>
            </div>
            <div className="flex gap-2"><button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button><button className="btn btn-tide" onClick={exportPdf}>Export PDF</button></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {[["Present", report.summary.present], ["Late", report.summary.late], ["Absent", report.summary.absent], ["Half day", report.summary.half], ["Attendance", `${report.summary.percentage}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-sand p-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="font-display text-3xl">{value}</p></div>)}
          </div>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead><tr><th>Student</th><th>Department</th><th>Date / range</th><th>Subject</th><th>Status</th><th>Device</th></tr></thead>
              <tbody>
                {report.rows.map((row, index) => <tr key={index}><td>{row.studentId} · {row.studentName}</td><td>{row.department}</td><td>{row.date}</td><td>{row.subject}</td><td><StatusBadge status={String(row.status)} /></td><td>{row.deviceId}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
