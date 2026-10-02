"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { LoadingState, PageHeader, Pagination, SearchBar, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { downloadCsv, downloadPdf } from "@/lib/exporters";

type Row = { id: number; date: string; subject: string; teacher: string; entry: string; exit: string; status: string; deviceId: string | null };

export default function StudentAttendancePage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");
  const [subjects, setSubjects] = useState<{ id: number; subjectName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ analytics: { subjects: { name: string }[] } }>("/api/analytics/student").then((res) => {
      setSubjects(res.analytics.subjects.map((item, index) => ({ id: index + 1, subjectName: item.name })));
    }).catch(() => undefined);
  }, []);

  async function load(next = page) {
    setLoading(true);
    const subjectName = subjects.find((item) => String(item.id) === subjectId)?.subjectName || "";
    const params = new URLSearchParams({ page: String(next), limit: "10", search: subjectName || search, date, month, status });
    const res = await api<{ data: Row[]; pages: number }>(`/api/attendance?${params}`);
    setRows(res.data);
    setPages(res.pages);
    setLoading(false);
  }
  useEffect(() => {
    const id = setTimeout(() => { void load(page).catch((error) => toast.error(error.message)); }, 0);
    return () => clearTimeout(id);
  }, [page, search, date, month, status, subjectId]);

  async function exportAll(kind: "csv" | "pdf") {
    const res = await api<{ data: Row[] }>("/api/attendance?limit=50");
    const head = ["Date", "Subject", "Teacher", "Entry Time", "Exit Time", "Status", "Device ID"];
    const body = res.data.map((row) => [row.date, row.subject, row.teacher, row.entry, row.exit, row.status, row.deviceId || "—"]);
    if (kind === "csv") downloadCsv("my-attendance.csv", [head, ...body]);
    else downloadPdf({ filename: "my-attendance.pdf", institution: "Crestview University", title: "Student Attendance Report", subtitle: "Personal attendance history", head, body });
  }

  return (
    <div>
      <PageHeader eyebrow="History" title="Attendance" subtitle="Search and export your own records. This view cannot edit or delete attendance." action={<div className="flex gap-2"><button className="btn btn-ghost" onClick={() => exportAll("csv")}>Export CSV</button><button className="btn btn-tide" onClick={() => exportAll("pdf")}>Export PDF</button></div>} />
      <div className="panel p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <SearchBar value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Subject or device" />
          <input className="field" type="date" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} />
          <input className="field" type="month" value={month} onChange={(e) => { setPage(1); setMonth(e.target.value); }} />
          <select className="field" value={subjectId} onChange={(e) => { setPage(1); setSubjectId(e.target.value); }}><option value="">Subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select>
          <select className="field" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">Status</option>{["Present", "Late", "Absent", "Half Day", "Leave"].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {loading ? <LoadingState /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Subject</th><th>Teacher</th><th>Entry Time</th><th>Exit Time</th><th>Status</th><th>Device ID</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.subject}</td><td>{row.teacher}</td><td>{row.entry}</td><td>{row.exit}</td><td><StatusBadge status={row.status} /></td><td>{row.deviceId || "—"}</td></tr>)}</tbody>
            </table>
            {!rows.length && <p className="py-8 text-center text-sm text-slate-500">No attendance matches these filters.</p>}
          </div>
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </div>
  );
}
