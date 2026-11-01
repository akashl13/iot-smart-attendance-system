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
    <div className="dashboard-page">
      <PageHeader eyebrow="Today · Asia/Kolkata" title="Campus attendance" subtitle="Live RFID scans, device health and department performance from the attendance database." />

      <div className="dashboard-stat-grid">
        <DashboardCard label="Total students" value={stats.totalStudents} hint="Active roster" icon={<Users size={18} />} />
        <DashboardCard label="Present today" value={stats.presentToday} hint="On-time entry" icon={<UserCheck size={18} />} delay={0.05} />
        <DashboardCard label="Absent today" value={stats.absentToday} hint="Unmarked or absent" icon={<UserX size={18} />} delay={0.08} />
        <DashboardCard label="Late today" value={stats.lateToday} hint="After 09:15 IST" icon={<Clock3 size={18} />} delay={0.1} />
        <DashboardCard label="Attendance rate" value={`${stats.attendancePercentage}%`} hint="Present + late + half day" icon={<Activity size={18} />} />
        <DashboardCard label="Assigned RFID cards" value={stats.registeredRfid} hint="Assigned cards" icon={<CreditCard size={18} />} />
        <DashboardCard label="Active IoT devices" value={stats.activeDevices} hint="Heartbeat within 3 min" icon={<Cpu size={18} />} />
      </div>

      <div className="dashboard-live-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div className="dashboard-panel-title">
              <h2>Live attendance</h2>
              <p>
                Polled from the scan log. A WebSocket can replace this later without changing the scan endpoint.
              </p>
            </div>
            <span className="pulse-dot" />
          </div>

          <div className="dashboard-scan-list">
            {data.live.map((scan) => (
              <article key={scan.id} className="dashboard-scan-row">
                <p className="dashboard-scan-time">{scan.time || "—"}</p>
                <div className="dashboard-scan-detail">
                  <p className="dashboard-scan-name">{scan.studentName || "Unknown card"}</p>
                  <p className="dashboard-scan-meta">RFID {scan.rfidUid} · {scan.deviceId || "Device"}</p>
                </div>
                <div className="dashboard-scan-status"><StatusBadge status={scan.success ? scan.status || "Present" : "Rejected"} /></div>
              </article>
            ))}
            {!data.live.length && <p className="dashboard-empty">No scans yet. Use the IoT Control Center to simulate a NodeMCU request.</p>}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading dashboard-readers-heading">
            <div className="dashboard-panel-title"><h2>Readers</h2></div>
          </div>
          <div className="dashboard-reader-list">
            {data.devices.map((device) => (
              <div key={device.id} className="dashboard-reader-row">
                <div className="dashboard-reader-heading">
                  <p className="dashboard-reader-code">{device.deviceCode}</p>
                  <StatusBadge status={device.status} />
                </div>
                <p className="dashboard-reader-name">{device.name}</p>
                <p className="dashboard-reader-meta">{device.location} · {formatRelative(device.lastSeen)}</p>
              </div>
            ))}
            {!data.devices.length && <p className="dashboard-empty">No readers are registered.</p>}
          </div>
        </section>
      </div>

      <div className="dashboard-chart-grid">
        <ChartCard title="Daily attendance" subtitle="Last 14 class-looking days"><TrendChart data={data.charts.daily} lines={[{ key: "present", color: "#0e6e6a", name: "Present" }, { key: "late", color: "#c2410c", name: "Late" }, { key: "absent", color: "#9f1239", name: "Absent" }]} /></ChartCard>
        <ChartCard title="Status mix"><StatusPie data={data.charts.statusMix} /></ChartCard>
        <ChartCard title="Department attendance" subtitle="Percentage excluding leave"><BarBlock data={data.charts.departments} /></ChartCard>
        <ChartCard title="Subject attendance"><BarBlock data={data.charts.subjects} color="#1b3348" /></ChartCard>
      </div>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading dashboard-readers-heading">
          <div className="dashboard-panel-title"><h2>Not yet marked today</h2></div>
        </div>
        <div className="dashboard-absent-grid">
          {data.absentStudents.map((student) => (
            <div key={student.studentId} className="dashboard-absent-row">
              <div className="dashboard-absent-detail">
                <p className="dashboard-absent-name">{student.name}</p>
                <p className="dashboard-absent-meta">{student.studentId} · {student.department} · Sem {student.semester}</p>
              </div>
              <StatusBadge status="Absent" />
            </div>
          ))}
          {!data.absentStudents.length && <p className="dashboard-empty">Every active student has a record today.</p>}
        </div>
      </section>
    </div>
  );
}
