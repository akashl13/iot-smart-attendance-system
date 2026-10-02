"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Cpu,
  Play,
  Pause,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/providers";
import { LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { api, apiRaw } from "@/lib/api-client";
import { todayKolkata } from "@/lib/format";

type Student = {
  id: number;
  studentCode: string;
  name: string;
  department: string;
  course: string;
  semester: number;
  section: string;
  rfidUid: string | null;
  attendanceStatus?: string;
  entryTime?: string | null;
};

type Department = { id: number; name: string; code: string };
type Course = { id: number; name: string };
type Subject = { id: number; subjectName: string; subjectCode: string };
type Device = { id: number; deviceId: string; name: string; status: string; ipAddress: string | null };
type Scan = {
  id: number;
  time: string | null;
  rfidUid: string;
  studentName: string | null;
  status: string | null;
  deviceId: string | null;
  success: boolean;
  message: string | null;
  createdAt: string;
};

// Simple Web Audio API Synthesizer Chime
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Play pleasant high chord (E5 -> A5)
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.frequency.setValueAtTime(1318.5, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch {
    // Audio context may be restricted by browser policy before first interaction
  }
}

export default function LiveAttendancePage() {
  const toast = useToast();

  // Session state
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters & Catalogs
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("NODEMCU-01");
  const [date, setDate] = useState(todayKolkata());

  // Roster and Scans
  const [students, setStudents] = useState<Student[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Green LED Blink simulation
  const [ledBlinking, setLedBlinking] = useState(false);
  const [lastMarkedStudent, setLastMarkedStudent] = useState<{
    name: string;
    code: string;
    time: string;
    status: string;
  } | null>(null);

  // Quick RFID scan test
  const [testUid, setTestUid] = useState("A3 7F 21 9C");
  const [scanning, setScanning] = useState(false);

  const prevScanIdRef = useRef<number | null>(null);

  // Timer for session duration
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Load catalogs on mount
  useEffect(() => {
    Promise.all([
      api<{ departments: Department[]; courses: Course[] }>("/api/departments"),
      api<{ data: Subject[] }>("/api/subjects"),
      api<{ data: Device[] }>("/api/devices"),
    ])
      .then(([cat, subRes, devRes]) => {
        setDepartments(cat.departments || []);
        setCourses(cat.courses || []);
        setSubjects(subRes.data || []);
        setDevices(devRes.data || []);
        if (devRes.data && devRes.data.length > 0) {
          const nodemcu = devRes.data.find((d) => d.deviceId === "NODEMCU-01");
          if (nodemcu) setSelectedDevice(nodemcu.deviceId);
        }
      })
      .catch((err) => toast.error(err.message));
  }, [toast]);

  // Function to trigger green LED blinking effect
  function triggerGreenLed(name: string, code: string, status = "Present") {
    setLedBlinking(true);
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLastMarkedStudent({ name, code, time: nowTime, status });

    if (soundEnabled) {
      playSuccessChime();
    }

    // Stop blinking after 1.8 seconds (3 pulses)
    setTimeout(() => {
      setLedBlinking(false);
    }, 1800);
  }

  // Load students roster and today's attendance
  async function loadRoster() {
    try {
      const studentParams = new URLSearchParams({
        limit: "100",
        departmentId: departmentId || "",
        courseId: courseId || "",
      });
      const attendanceParams = new URLSearchParams({
        date: date || todayKolkata(),
        departmentId: departmentId || "",
        courseId: courseId || "",
        subjectId: subjectId || "",
        limit: "100",
      });

      const [studRes, attRes, scanRes] = await Promise.all([
        api<{ data: Student[] }>(`/api/students?${studentParams}`),
        api<{ data: { studentDbId: number; status: string; entry: string }[] }>(`/api/attendance?${attendanceParams}`),
        api<{ data: Scan[] }>("/api/scans?limit=10"),
      ]);

      const attendanceMap = new Map<number, { status: string; entry: string }>();
      (attRes.data || []).forEach((row) => {
        attendanceMap.set(row.studentDbId, { status: row.status, entry: row.entry });
      });

      const merged = (studRes.data || []).map((s) => ({
        ...s,
        attendanceStatus: attendanceMap.get(s.id)?.status || "Unmarked",
        entryTime: attendanceMap.get(s.id)?.entry || null,
      }));

      // Detect any new incoming physical scan from NodeMCU
      const latestScans = scanRes.data || [];
      if (latestScans.length > 0) {
        const topScan = latestScans[0];
        if (prevScanIdRef.current !== null && topScan.id !== prevScanIdRef.current) {
          if (topScan.success && topScan.studentName) {
            triggerGreenLed(topScan.studentName, topScan.rfidUid, topScan.status || "Present");
            toast.success(`RFID Scan Verified: ${topScan.studentName} marked PRESENT!`);
          }
        }
        prevScanIdRef.current = topScan.id;
      }

      setStudents(merged);
      setScans(latestScans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Initial and reactive fetch
  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      void loadRoster();
    }, 0);
    return () => clearTimeout(id);
  }, [departmentId, courseId, subjectId, date]);

  // Polling loop for live hardware scans every 1.8 seconds while session is active
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      void loadRoster();
    }, 1800);
    return () => clearInterval(interval);
  }, [sessionActive, departmentId, courseId, subjectId, date]);

  // Mark attendance manually from the UI
  async function markAttendance(student: Student, targetStatus = "Present") {
    setMarkingId(student.id);
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const payload = {
      studentId: String(student.id),
      date: date || todayKolkata(),
      status: targetStatus,
      entryTime: nowTime,
      subjectId: subjectId ? Number(subjectId) : null,
      deviceId: selectedDevice,
    };

    try {
      await api("/api/attendance", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Trigger the Green LED Blink!
      triggerGreenLed(student.name, student.studentCode, targetStatus);
      toast.success(`${student.name} marked ${targetStatus}!`);

      // Update local state immediately for instant feedback
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, attendanceStatus: targetStatus, entryTime: nowTime }
            : s
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance");
    } finally {
      setMarkingId(null);
    }
  }

  // Quick simulate scan from UI
  async function handleSimulateScan() {
    if (!testUid.trim()) return;
    setScanning(true);
    try {
      const res = await apiRaw("/api/rfid/scan", {
        method: "POST",
        body: JSON.stringify({ rfidUID: testUid.trim(), deviceId: selectedDevice }),
      });

      if (res.data?.success) {
        triggerGreenLed(res.data.studentName || "Registered Card", res.data.studentId || testUid, res.data.status || "Present");
        toast.success(`Scan Accepted: ${res.data.studentName || "Student"} marked PRESENT!`);
        await loadRoster();
      } else {
        toast.error(res.data?.message || "Card scan rejected or unregistered");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || (s.rfidUid && s.rfidUid.toLowerCase().includes(q));
  });

  const presentCount = students.filter((s) => s.attendanceStatus === "Present" || s.attendanceStatus === "Late").length;
  const absentCount = students.filter((s) => s.attendanceStatus === "Absent" || s.attendanceStatus === "Unmarked").length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  const nodeMcuDevice = devices.find((d) => d.deviceId === "NODEMCU-01");
  const isHardwareOnline = nodeMcuDevice?.status === "ONLINE";

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/attendance"
            className="btn btn-ghost p-2 text-slate-500 hover:text-slate-900 rounded-xl"
            title="Back to Attendance Ledger"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                LIVE ATTENDANCE CONSOLE
              </span>
              <span className="font-mono text-xs font-semibold text-slate-500">
                Session: {formatTimer(sessionSeconds)}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Start Live Attendance Session
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`btn px-3 py-2 text-xs font-semibold flex items-center gap-1.5 rounded-xl border transition-all ${
              soundEnabled
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Sound: {soundEnabled ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setSessionActive(!sessionActive)}
            className={`btn px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-xl text-white transition-all shadow-md ${
              sessionActive
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
            }`}
          >
            {sessionActive ? (
              <>
                <Pause size={15} /> Pause Session
              </>
            ) : (
              <>
                <Play size={15} /> Resume Session
              </>
            )}
          </button>

          <button
            onClick={() => loadRoster()}
            className="btn btn-ghost px-3 py-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5 rounded-xl border border-slate-200"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Class Size</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{students.length}</p>
          <p className="mt-1 text-xs text-slate-500">Enrolled Students</p>
        </div>

        <div className="panel p-4 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Present Today</span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{presentCount}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Marked Present / Late</p>
        </div>

        <div className="panel p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Unmarked / Absent</span>
            <UserX size={18} className="text-rose-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-700">{absentCount}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting Tap or Check-in</p>
        </div>

        <div className="panel p-4 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Attendance Rate</span>
            <span className="font-mono text-sm font-bold text-teal-700">{attendanceRate}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{presentCount} of {students.length} students recorded</p>
        </div>
      </div>

      {/* HARDWARE HUD & GREEN LED SIMULATOR */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Interactive Green LED Hardware Module */}
        <div className="panel p-6 border-2 border-slate-200/90 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Cpu size={140} />
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isHardwareOnline ? "bg-emerald-400" : "bg-amber-400"} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isHardwareOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              <span className="font-mono text-sm font-bold text-slate-200">
                ESP8266 IoT Attendance Station
              </span>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 font-mono text-[11px] font-semibold text-slate-300 border border-slate-700">
              Pin D1 / GPIO5
            </span>
          </div>

          {/* Glowing Green LED Display */}
          <div className="my-6 flex flex-col items-center justify-center text-center">
            <div className="relative my-3 flex items-center justify-center">
              {/* Outer pulsing radiation when blinking */}
              {ledBlinking && (
                <>
                  <div className="absolute h-36 w-36 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
                  <div className="absolute h-28 w-28 rounded-full bg-emerald-400/40 blur-xl animate-pulse" />
                </>
              )}

              {/* Physical LED diode representation */}
              <div
                className={`relative h-20 w-20 rounded-full border-4 transition-all duration-200 flex items-center justify-center shadow-2xl ${
                  ledBlinking
                    ? "bg-emerald-400 border-emerald-200 shadow-[0_0_50px_#10b981] scale-110"
                    : "bg-emerald-950/60 border-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-full transition-all duration-200 ${
                    ledBlinking ? "bg-emerald-200 shadow-inner" : "bg-emerald-900/40"
                  }`}
                />
              </div>
            </div>

            <p className="mt-2 text-sm font-bold tracking-wide uppercase">
              {ledBlinking ? (
                <span className="text-emerald-400 animate-pulse flex items-center gap-2">
                  <Zap size={16} /> 🟢 GREEN LED BLINKING: ATTENDANCE CONFIRMED!
                </span>
              ) : (
                <span className="text-slate-400 font-normal">
                  Hardware Green LED Status: <strong className="text-slate-200">READY</strong>
                </span>
              )}
            </p>

            {lastMarkedStudent ? (
              <div className="mt-4 w-full rounded-2xl bg-emerald-950/50 border border-emerald-800/60 p-4 text-left backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Latest Verified Attendee
                  </span>
                  <span className="text-xs font-mono text-emerald-300">{lastMarkedStudent.time}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-white">{lastMarkedStudent.name}</h3>
                  <span className="font-mono text-xs font-semibold text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-md">
                    {lastMarkedStudent.code}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-200/90 font-medium">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Marked {lastMarkedStudent.status} · Green LED pulsed 3x on NodeMCU
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Tap an RFID card or click &quot;Mark Present&quot; on any student below to verify and blink the Green LED.
              </p>
            )}
          </div>

          {/* Hardware Quick Facts */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4 text-xs font-mono text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Reader</span>
              <span className="text-slate-200">{selectedDevice}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Status</span>
              <span className={isHardwareOnline ? "text-emerald-400 font-bold" : "text-amber-400"}>
                {isHardwareOnline ? "ONLINE 🟢" : "OFFLINE / DHCP"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Host IP</span>
              <span className="text-slate-200">{nodeMcuDevice?.ipAddress || "192.168.1.82"}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Card Tap Bench & Session Setup */}
        <div className="space-y-4">
          {/* Session Filters */}
          <div className="panel p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" /> Class Session Settings
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label text-xs">Department</span>
                <select
                  className="field text-xs py-2"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label text-xs">Course</span>
                <select
                  className="field text-xs py-2"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label text-xs">Subject / Lecture</span>
                <select
                  className="field text-xs py-2"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">Default Schedule</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectCode} · {s.subjectName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label text-xs">Date</span>
                <input
                  type="date"
                  className="field text-xs py-2"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Quick RFID Tap Tester */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap size={16} className="text-amber-600" /> RFID Simulator / Card Tester
              </h3>
              <span className="text-[11px] text-slate-400">Trigger manual tap</span>
            </div>

            <p className="text-xs text-slate-500">
              Scan a card on your physical NodeMCU reader or trigger a card UID here:
            </p>

            <div className="flex gap-2">
              <input
                className="field font-mono text-xs uppercase"
                placeholder="RFID UID (e.g. A3 7F 21 9C)"
                value={testUid}
                onChange={(e) => setTestUid(e.target.value.toUpperCase())}
              />
              <button
                disabled={scanning}
                onClick={handleSimulateScan}
                className="btn btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm"
              >
                {scanning ? "Processing..." : "Tap Card"}
              </button>
            </div>

            {/* Quick Suggestions from Registered Students */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 self-center mr-1">Quick Select:</span>
              {students
                .filter((s) => s.rfidUid)
                .slice(0, 4)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTestUid(s.rfidUid || "")}
                    className="rounded-lg bg-slate-100 hover:bg-indigo-50 px-2 py-1 font-mono text-[10px] text-slate-700 hover:text-indigo-700 transition-colors"
                  >
                    {s.name.split(" ")[0]} ({s.rfidUid})
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROSTER AND INSTANT ATTENDANCE MARKING */}
      <div className="panel p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Class Roster & Quick Attendance</h2>
            <p className="text-xs text-slate-500">
              Students will automatically appear as &quot;Present&quot; when their RFID is scanned, or you can click
              &quot;Mark Present&quot; below to trigger attendance & green LED blink manually.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="field pl-9 text-xs"
              placeholder="Filter by student name or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading live roster..." />
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No students found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 px-4">Roll No</th>
                  <th className="pb-3 px-4">Class / Dept</th>
                  <th className="pb-3 px-4">RFID Card</th>
                  <th className="pb-3 px-4">Today&apos;s Status</th>
                  <th className="pb-3 px-4">Check-in Time</th>
                  <th className="pb-3 pl-4 text-right">Instant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const isPresent = student.attendanceStatus === "Present" || student.attendanceStatus === "Late";
                  const isBusy = markingId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPresent ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                              isPresent
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.section ? `Sec ${student.section}` : ""}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                        {student.studentCode}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {student.course} · Sem {student.semester}
                      </td>

                      <td className="py-3.5 px-4">
                        {student.rfidUid ? (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {student.rfidUid}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No RFID card</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={student.attendanceStatus} />
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {student.entryTime || "—"}
                      </td>

                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPresent ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              Recorded
                            </div>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => markAttendance(student, "Present")}
                              className="btn px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                            >
                              <UserCheck size={14} />
                              {isBusy ? "Marking..." : "Mark Present"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LIVE SCAN FEED (RECENT HARDWARE / SIMULATOR SCANS) */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wifi size={16} className="text-emerald-600" /> Live RFID Activity Log
            </h3>
            <p className="text-xs text-slate-500">
              Stream of incoming scans received by POST /api/rfid/scan
            </p>
          </div>
          <span className="pulse-dot" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {scans.slice(0, 6).map((scan) => (
            <div
              key={scan.id}
              className={`rounded-xl border p-3 text-xs transition-all ${
                scan.success
                  ? "bg-emerald-50/40 border-emerald-200/80"
                  : "bg-slate-50 border-slate-200/70"
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-900 truncate">{scan.studentName || "Unassigned Card"}</span>
                <span className="font-mono text-[10px] text-slate-500">{scan.time || "Just now"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200/70">
                  {scan.rfidUid}
                </span>
                <StatusBadge status={scan.success ? scan.status || "Present" : "Rejected"} />
              </div>
            </div>
          ))}
          {scans.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-slate-400">
              No RFID scans logged yet today. Present your card to the reader.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
