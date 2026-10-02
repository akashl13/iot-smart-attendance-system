"use client";

import { Activity, Cpu, CreditCard, UserCheck, UserX, Users, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { BarBlock, StatusPie, TrendChart } from "@/components/charts";
import { ChartCard, DashboardCard, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";

type Analytics = {
  stats: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    attendancePercentage: number;
    registeredRfid: number;
    activeDevices: number;
  };
  charts: {
    daily: { date: string; present: number; late: number; absent: number }[];
    weekly: { week: string; percentage: number }[];
    departments: { name: string; percentage: number }[];
    subjects: { name: string; percentage: number }[];
    statusMix: { name: string; value: number }[];
  };
  absentStudents: { studentId: string; name: string; department: string; semester: number }[];
  devices: { id: number; deviceCode: string; name: string; status: string; lastSeen: string | null; location: string }[];
  live: { id: number; time: string | null; rfidUid: string; studentName: string | null; status: string | null; deviceId: string | null; success: boolean; message: string | null }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => api<{ analytics: Analytics }>("/api/analytics/admin").then((res) => { if (!stop) setData(res.analytics); }).catch(() => undefined);
    load();
    const id = setInterval(load, 6000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  if (!data) return <LoadingState label="Opening the registrar console" />;
  const stats = data.stats;
  return (
    <div>
      <PageHeader eyebrow="Today · Asia/Kolkata" title="Campus attendance" subtitle="Live RFID scans, device health and department performance from the attendance database." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total students" value={stats.totalStudents} hint="Active roster" icon={<Users size={18} />} />
        <DashboardCard label="Present today" value={stats.presentToday} hint="On-time entry" icon={<UserCheck size={18} />} delay={0.05} />
        <DashboardCard label="Absent today" value={stats.absentToday} hint="Unmarked or absent" icon={<UserX size={18} />} delay={0.08} />
        <DashboardCard label="Late today" value={stats.lateToday} hint="After 09:15 IST" icon={<Clock3 size={18} />} delay={0.1} />
        <DashboardCard label="Attendance" value={`${stats.attendancePercentage}%`} hint="Present + late + half day" icon={<Activity size={18} />} />
        <DashboardCard label="RFID cards" value={stats.registeredRfid} hint="Assigned cards" icon={<CreditCard size={18} />} />
        <DashboardCard label="Active devices" value={stats.activeDevices} hint="Heartbeat within 3 min" icon={<Cpu size={18} />} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl">Live attendance</h2>
              <p className="text-sm text-slate-500">Polled from the scan log. A WebSocket can replace this later without changing the scan endpoint.</p>
            </div>
            <span className="pulse-dot" />
          </div>
          <div className="space-y-3">
            {data.live.map((scan) => (
              <article key={scan.id} className="grid gap-2 rounded-2xl bg-sand px-4 py-3 sm:grid-cols-[90px_1fr_auto]">
                <p className="font-mono text-sm">{scan.time || "—"}</p>
                <div>
                  <p className="font-semibold">{scan.studentName || "Unknown card"}</p>
                  <p className="font-mono text-xs text-slate-500">RFID {scan.rfidUid} · {scan.deviceId || "Device"}</p>
                </div>
                <StatusBadge status={scan.success ? scan.status || "Present" : "Rejected"} />
              </article>
            ))}
            {!data.live.length && <p className="text-sm text-slate-500">No scans yet. Use the IoT Control Center to simulate a NodeMCU request.</p>}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-3xl">Readers</h2>
          <div className="mt-4 space-y-3">
            {data.devices.map((device) => (
              <div key={device.id} className="rounded-2xl border border-line p-3">
                <div className="flex items-center justify-between"><p className="font-semibold">{device.deviceCode}</p><StatusBadge status={device.status} /></div>
                <p className="text-sm text-slate-500">{device.name}</p>
                <p className="text-xs text-slate-400">{device.location} · {formatRelative(device.lastSeen)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Daily attendance" subtitle="Last 14 class-looking days"><TrendChart data={data.charts.daily} lines={[{ key: "present", color: "#0e6e6a", name: "Present" }, { key: "late", color: "#c2410c", name: "Late" }, { key: "absent", color: "#9f1239", name: "Absent" }]} /></ChartCard>
        <ChartCard title="Status mix"><StatusPie data={data.charts.statusMix} /></ChartCard>
        <ChartCard title="Department attendance" subtitle="Percentage excluding leave"><BarBlock data={data.charts.departments} /></ChartCard>
        <ChartCard title="Subject attendance"><BarBlock data={data.charts.subjects} color="#1b3348" /></ChartCard>
      </div>
      <section className="panel mt-4 p-5">
        <h2 className="font-display text-3xl">Not yet marked today</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.absentStudents.map((student) => (
            <div key={student.studentId} className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
              <div><p className="font-semibold">{student.name}</p><p className="text-xs text-slate-500">{student.studentId} · {student.department} · Sem {student.semester}</p></div>
              <StatusBadge status="Absent" />
            </div>
          ))}
          {!data.absentStudents.length && <p className="text-sm text-slate-500">Every active student has a record today.</p>}
        </div>
      </section>
    </div>
  );
}
