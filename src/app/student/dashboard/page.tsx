"use client";

import { CalendarCheck, Clock3, Percent, UserX, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BarBlock, TrendChart } from "@/components/charts";
import { ChartCard, DashboardCard, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { weekdayOf } from "@/lib/format";

type Dashboard = {
  profile: { name: string; studentId: string; department: string; course: string; semester: number; section: string; email: string; phone: string; rfidUid: string | null; rfidStatus: string; enrollmentNumber: string };
  stats: { percentage: number; present: number; absent: number; late: number; total: number };
  monthly: { month: string; percentage: number }[];
  subjects: { name: string; percentage: number }[];
  trend: { date: string; percentage: number }[];
  calendar: { date: string; status: string }[];
  month: string;
  recent: { id: number; date: string; subject: string; teacher: string; entryTime: string | null; exitTime: string | null; status: string }[];
  threshold: number;
};

export default function StudentDashboardPage() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    const query = month ? `?month=${month}` : "";
    api<{ analytics: Dashboard }>(`/api/analytics/student${query}`).then((res) => { setData(res.analytics); if (!month) setMonth(res.analytics.month); }).catch(() => undefined);
  }, [month]);
  const cells = useMemo(() => buildCalendar(data?.month || month, data?.calendar || []), [data, month]);
  if (!data) return <LoadingState label="Loading your attendance" />;
  return (
    <div>
      <PageHeader eyebrow={data.profile.studentId} title={`Welcome, ${data.profile.name.split(" ")[0]}`} subtitle={`${data.profile.course} · Semester ${data.profile.semester}${data.profile.section} · ${data.profile.department}`} action={<StatusBadge status={data.profile.rfidStatus} />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Attendance" value={`${data.stats.percentage}%`} hint={`Policy ${data.threshold}%`} icon={<Percent size={18} />} />
        <DashboardCard label="Present days" value={data.stats.present} icon={<CalendarCheck size={18} />} delay={0.04} />
        <DashboardCard label="Absent days" value={data.stats.absent} icon={<UserX size={18} />} delay={0.08} />
        <DashboardCard label="Late days" value={data.stats.late} icon={<Clock3 size={18} />} delay={0.1} />
        <DashboardCard label="Total classes" value={data.stats.total} icon={<Users size={18} />} delay={0.12} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Monthly attendance" subtitle="Percentage by month"><TrendChart data={data.monthly} x="month" lines={[{ key: "percentage", name: "Attendance %", color: "#0e6e6a" }]} /></ChartCard>
        <ChartCard title="Subject-wise" subtitle="Your recorded subjects"><BarBlock data={data.subjects} /></ChartCard>
        <ChartCard title="Trend" subtitle="Running percentage"><TrendChart data={data.trend} lines={[{ key: "percentage", name: "Trend", color: "#1b3348" }]} /></ChartCard>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-3xl">Calendar</h2>
            <input className="field w-auto" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
            {cells.map((cell, index) => (
              <div key={index} className={`grid h-12 place-items-center rounded-xl text-sm ${cell.tone}`}>{cell.label}</div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", data.profile.name],
              ["Student ID", data.profile.studentId],
              ["Department", data.profile.department],
              ["Course", data.profile.course],
              ["Semester", `${data.profile.semester} ${data.profile.section}`],
              ["Email", data.profile.email],
              ["Phone", data.profile.phone],
              ["RFID UID", data.profile.rfidUid || "Not registered"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-sand px-3 py-3"><dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">Students cannot modify attendance records. Corrections go through the registrar.</p>
        </section>
      </div>
      <section className="panel mt-4 p-5">
        <h2 className="mb-3 font-display text-3xl">Recent attendance</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Subject</th><th>Entry</th><th>Exit</th><th>Status</th></tr></thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id}><td>{row.date}</td><td>{row.subject}</td><td>{row.entryTime || "—"}</td><td>{row.exitTime || "—"}</td><td><StatusBadge status={row.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function buildCalendar(month: string, days: { date: string; status: string }[]) {
  if (!month) return [];
  const [year, mon] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const lead = weekdayOf(`${month}-01`);
  const map = Object.fromEntries(days.map((day) => [day.date, day.status]));
  const tones: Record<string, string> = { Present: "bg-emerald-100 text-emerald-900", Late: "bg-orange-100 text-orange-900", Absent: "bg-rose-100 text-rose-900", "Half Day": "bg-amber-100", Leave: "bg-sky-100 text-sky-900" };
  const cells = Array.from({ length: lead }, () => ({ label: "", tone: "" }));
  for (let day = 1; day <= count; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({ label: String(day), tone: tones[map[date]] || "bg-white text-slate-600" });
  }
  return cells;
}
