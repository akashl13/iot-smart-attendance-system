"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Pause,
  Play,
  Radio,
  Search,
  Square,
  UserCheck,
  UserX,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useConfirm, useToast } from "@/components/providers";
import { StatusBadge } from "@/components/ui";
import { ApiError, api, apiRaw } from "@/lib/api-client";
import { todayKolkata } from "@/lib/format";

type StudentRecord = {
  id: number;
  studentCode: string;
  name: string;
  department: string;
  course: string;
  semester: number;
  section: string;
  rfidUid: string | null;
  status: string;
};

type Student = StudentRecord & {
  attendanceRecordId: number | null;
  attendanceStatus: string;
  entryTime: string | null;
};

type AttendanceRecord = {
  id: number;
  studentDbId: number;
  status: string;
  entry: string;
};

type Device = {
  id: number;
  deviceId: string;
  name: string;
  status: string;
  ipAddress: string | null;
  lastSeen: string | null;
};

type Scan = {
  id: number;
  time: string | null;
  rfidUid: string;
  studentName: string | null;
  studentCode: string | null;
  status: string | null;
  deviceId: string | null;
  success: boolean;
  message: string | null;
  createdAt: string;
};

type Filters = { date: string; departmentId: string; courseId: string; subjectId: string };

async function getAllPages<T>(path: string) {
  const url = new URL(path, "http://smartattend.local");
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "50");
  const first = await api<{ data: T[]; pages: number }>(`${url.pathname}${url.search}`);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, async (_, index) => {
      url.searchParams.set("page", String(index + 2));
      return api<{ data: T[] }>(`${url.pathname}${url.search}`);
    }),
  );
  return [...first.data, ...remaining.flatMap((page) => page.data)];
}

function attendanceParams(filters: Filters) {
  return new URLSearchParams({
    date: filters.date,
    departmentId: filters.departmentId,
    courseId: filters.courseId,
    subjectId: filters.subjectId,
    page: "1",
    limit: "50",
  });
}

async function loadRoster(filters: Filters): Promise<Student[]> {
  const studentParams = new URLSearchParams({
    status: "ACTIVE",
    departmentId: filters.departmentId,
    courseId: filters.courseId,
  });
  const [roster, records] = await Promise.all([
    getAllPages<StudentRecord>(`/api/students?${studentParams}`),
    getAllPages<AttendanceRecord>(`/api/attendance?${attendanceParams(filters)}`),
  ]);
  const byStudent = new Map(records.map((record) => [record.studentDbId, record]));
  return roster.map((student) => {
    const record = byStudent.get(student.id);
    return {
      ...student,
      attendanceRecordId: record?.id ?? null,
      attendanceStatus: record?.status ?? "Unmarked",
      entryTime: record?.entry ?? null,
    };
  });
}

function mergeAttendance(roster: Student[], records: AttendanceRecord[]) {
  const byStudent = new Map(records.map((record) => [record.studentDbId, record]));
  return roster.map((student) => {
    const record = byStudent.get(student.id);
    return {
      ...student,
      attendanceRecordId: record?.id ?? null,
      attendanceStatus: record?.status ?? "Unmarked",
      entryTime: record?.entry ?? null,
    };
  });
}

function currentTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

export default function LiveAttendancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([]);
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; subjectName: string; subjectCode: string }[]>([]);
  const [lastScan, setLastScan] = useState<Scan | null>(null);
  const [testResult, setTestResult] = useState<{
    recognized: boolean;
    uid: string;
    message: string;
    studentName?: string;
    studentCode?: string;
    attendanceStatus?: string;
  } | null>(null);
  const [date, setDate] = useState(todayKolkata());
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("NODEMCU-01");
  const [testUid, setTestUid] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sessionState, setSessionState] = useState<"idle" | "active" | "paused" | "ended">("idle");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [loadedRosterKey, setLoadedRosterKey] = useState("");
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [deviceLoadFailed, setDeviceLoadFailed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const latestScanId = useRef<number | null>(null);
  const sessionActive = sessionState === "active";
  const rosterKey = `${date}|${departmentId}|${courseId}|${subjectId}`;
  const loading = loadedRosterKey !== rosterKey;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ departments: { id: number; name: string; code: string }[]; courses: { id: number; name: string }[] }>("/api/departments"),
      api<{ data: { id: number; subjectName: string; subjectCode: string }[] }>("/api/subjects"),
    ])
      .then(([catalog, subjectResponse]) => {
        if (cancelled) return;
        setDepartments(catalog.departments);
        setCourses(catalog.courses);
        setSubjects(subjectResponse.data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load session settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const filters = { date, departmentId, courseId, subjectId };
    Promise.all([
      loadRoster(filters),
      api<{ data: Scan[] }>("/api/scans?limit=10"),
    ])
      .then(([roster, scanResponse]) => {
        if (cancelled) return;
        setStudents(roster);
        const latest = scanResponse.data[0] ?? null;
        setLastScan(latest);
        latestScanId.current = latest?.id ?? null;
        setLoadedRosterKey(rosterKey);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadedRosterKey(rosterKey);
          toast.error(error instanceof Error ? error.message : "Could not load attendance.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [date, departmentId, courseId, subjectId, rosterKey, toast]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refreshDevices = async () => {
      try {
        const response = await api<{ data: Device[] }>("/api/devices");
        if (cancelled) return;
        setDevices(response.data);
        setDeviceLoadFailed(false);
        setDevicesLoaded(true);
        setSelectedDeviceId((current) => response.data.some((device) => device.deviceId === current)
          ? current
          : response.data.find((device) => device.status === "ONLINE")?.deviceId || response.data[0]?.deviceId || "");
      } catch {
        if (!cancelled) {
          setDeviceLoadFailed(true);
          setDevicesLoaded(true);
        }
      }
      if (!cancelled) timer = setTimeout(refreshDevices, 15000);
    };
    void refreshDevices();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!sessionActive) return;
    let cancelled = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;
    const filters = { date, departmentId, courseId, subjectId };
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const [records, scanResponse] = await Promise.all([
          getAllPages<AttendanceRecord>(`/api/attendance?${attendanceParams(filters)}`),
          api<{ data: Scan[] }>("/api/scans?limit=10"),
        ]);
        if (cancelled) return;
        setStudents((current) => mergeAttendance(current, records));
        const latest = scanResponse.data[0] ?? null;
        if (latest && latest.id !== latestScanId.current) {
          latestScanId.current = latest.id;
          setLastScan(latest);
          if (latest.success && latest.studentName) {
            toast.success(`${latest.studentName} attendance recorded.`);
          } else {
            toast.error(latest.message || "The RFID scan was rejected.");
          }
        }
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.status !== 401) {
          toast.error("Live attendance could not refresh. Check your connection.");
        }
      } finally {
        busy = false;
        if (!cancelled) timer = setTimeout(poll, 4000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionActive, date, departmentId, courseId, subjectId, toast]);

  useEffect(() => {
    if (!sessionActive) return;
    const timer = setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionActive]);

  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId);
  const deviceStatus = !devicesLoaded
    ? "checking"
    : deviceLoadFailed
      ? "unknown"
      : selectedDevice?.status === "ONLINE"
        ? "connected"
        : "disconnected";
  const presentCount = students.filter((student) => ["Present", "Late"].includes(student.attendanceStatus)).length;
  const absentCount = students.filter((student) => ["Absent", "Unmarked"].includes(student.attendanceStatus)).length;
  const eligibleCount = students.filter((student) => student.attendanceStatus !== "Leave").length;
  const halfDayCount = students.filter((student) => student.attendanceStatus === "Half Day").length;
  const attendancePercentage = eligibleCount
    ? Math.round(((presentCount + halfDayCount * 0.5) / eligibleCount) * 100)
    : 0;

  const filteredStudents = students.filter((student) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [student.name, student.studentCode, student.rfidUid || ""]
      .some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "All"
      || (statusFilter === "Present" && ["Present", "Late", "Half Day"].includes(student.attendanceStatus))
      || (statusFilter === "Absent" && ["Absent", "Unmarked"].includes(student.attendanceStatus))
      || student.attendanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleTestScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const uid = testUid.trim();
    if (!uid || scanning) return;
    setScanning(true);
    setTestResult(null);
    try {
      const params = new URLSearchParams({ uid });
      const response = await apiRaw(`/api/rfid/lookup?${params}`);
      const data = response.data as {
        found?: boolean;
        registered?: boolean;
        uid?: string;
        message?: string;
        student?: { name?: string; studentId?: string; todayStatus?: string };
      };
      const recognized = response.ok && data.registered === true && data.found === true;
      const message = data.message || (recognized ? "Card is linked to a student." : "This card is not linked to a student.");
      setTestResult({
        recognized,
        uid: data.uid || uid,
        message,
        studentName: data.student?.name,
        studentCode: data.student?.studentId,
        attendanceStatus: data.student?.todayStatus,
      });
      if (recognized) toast.success(`Test lookup found ${data.student?.name || "a registered student"}. No attendance was recorded.`);
      else toast.error(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test lookup failed.";
      setTestResult({ recognized: false, uid, message });
      toast.error(message);
    } finally {
      setScanning(false);
    }
  }

  async function markPresent(student: Student) {
    setMarkingId(student.id);
    const payload = {
      studentId: student.id,
      date,
      status: "Present",
      entryTime: new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
      subjectId: subjectId ? Number(subjectId) : null,
      deviceId: selectedDeviceId || null,
    };
    try {
      if (student.attendanceRecordId) {
        await api(`/api/attendance/${student.attendanceRecordId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/attendance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setStudents((current) => current.map((item) => item.id === student.id
        ? { ...item, attendanceStatus: "Present", entryTime: currentTime() }
        : item));
      toast.success(`Attendance recorded manually for ${student.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record attendance.");
    } finally {
      setMarkingId(null);
    }
  }

  function startSession() {
    if (sessionState === "idle" || sessionState === "ended") setSessionSeconds(0);
    setSessionState("active");
  }

  async function endSession() {
    const confirmed = await confirm({
      title: "End this attendance session?",
      message: "This ends live monitoring on this page. Connected RFID readers may continue sending scans to the server.",
      confirmLabel: "End session",
      danger: true,
    });
    if (confirmed) setSessionState("ended");
  }

  const formattedDuration = `${String(Math.floor(sessionSeconds / 60)).padStart(2, "0")}:${String(sessionSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="live-attendance-page">
      <header className="live-page-header">
        <div className="live-page-title">
          <p>Attendance</p>
          <h1>Live Attendance</h1>
          <span>Start monitoring, then let students tap their ID cards.</span>
        </div>
        <div className="live-session-controls" aria-label="Attendance session controls">
          <span className={`live-session-state is-${sessionState}`}>
            <span />
            {sessionState === "active" ? `Monitoring · ${formattedDuration}` : sessionState === "paused" ? "Monitoring paused" : sessionState === "ended" ? "Session ended" : "Not started"}
          </span>
          <button type="button" className="btn btn-primary live-action-button" onClick={startSession} disabled={sessionActive}>
            <Play size={16} /> {sessionState === "paused" ? "Resume Attendance" : "Start Attendance"}
          </button>
          <button type="button" className="btn btn-secondary live-action-button" onClick={() => setSessionState("paused")} disabled={!sessionActive}>
            <Pause size={16} /> Pause
          </button>
          <button type="button" className="btn btn-ghost live-action-button live-end-button" onClick={endSession} disabled={sessionState === "idle" || sessionState === "ended"}>
            <Square size={15} /> End Session
          </button>
        </div>
        {sessionState !== "idle" && <p className="live-session-note">Pause and End stop monitoring on this page only. Connected readers can still send scans to the server.</p>}
      </header>

      <section className="live-section" aria-labelledby="live-overview-title">
        <div className="live-section-heading">
          <div>
            <h2 id="live-overview-title">Attendance Overview</h2>
            <p>Today&apos;s records for the selected roster.</p>
          </div>
          {loading && <Loader2 className="live-loading-icon" size={18} aria-label="Loading attendance data" />}
        </div>
        <div className="live-overview-grid">
          <article className="live-overview-card">
            <span className="live-stat-icon blue"><Users size={19} /></span>
            <p>Total Students</p>
            <strong>{loading ? "—" : students.length}</strong>
          </article>
          <article className="live-overview-card">
            <span className="live-stat-icon green"><UserCheck size={19} /></span>
            <p>Present</p>
            <strong>{loading ? "—" : presentCount}</strong>
          </article>
          <article className="live-overview-card">
            <span className="live-stat-icon coral"><UserX size={19} /></span>
            <p>Absent</p>
            <strong>{loading ? "—" : absentCount}</strong>
          </article>
          <article className="live-overview-card">
            <span className="live-stat-icon ink"><CreditCard size={19} /></span>
            <p>Attendance Percentage</p>
            <strong>{loading ? "—" : `${attendancePercentage}%`}</strong>
          </article>
        </div>
      </section>

      <section className="live-section live-scanner-section" aria-labelledby="live-scanner-title">
        <div className="live-section-heading">
          <div>
            <h2 id="live-scanner-title">RFID Scanner</h2>
            <p>Tap your student ID card to record attendance.</p>
          </div>
          <div className={`live-device-status is-${deviceStatus}`} role="status" aria-live="polite">
            {deviceStatus === "connected" ? <Wifi size={17} /> : deviceStatus === "checking" ? <Loader2 className="live-loading-icon" size={17} /> : <WifiOff size={17} />}
            <span>{deviceStatus === "connected" ? "Connected" : deviceStatus === "disconnected" ? "Disconnected" : deviceStatus === "checking" ? "Checking reader" : "Status unavailable"}</span>
            {selectedDevice && <span className="live-device-name">{selectedDevice.name}</span>}
          </div>
        </div>

        <div className="live-scanner-body">
          <div className="live-scanner-emblem" aria-hidden="true"><Radio size={42} strokeWidth={1.6} /></div>
          <p className="live-scanner-instruction">Tap your student ID card to record attendance.</p>
          <p className="live-scanner-help">
            {sessionActive ? "Listening for a scan from the connected reader." : "Start attendance to watch for new reader scans."}
          </p>
          <div className={`live-scan-result ${lastScan ? lastScan.success ? "is-success" : "is-rejected" : "is-waiting"}`} aria-live="polite">
            {!lastScan ? <Clock3 size={21} /> : lastScan.success ? <CheckCircle2 size={21} /> : <WifiOff size={21} />}
            <div className="live-scan-copy">
              <strong>{!lastScan ? "Waiting for the first scan" : lastScan.success ? "Attendance recorded" : "Scan not accepted"}</strong>
              {lastScan ? (
                <>
                  <span>{lastScan.studentName || lastScan.message || "Unknown card"}</span>
                  <small>{lastScan.rfidUid} · {lastScan.time || "Time unavailable"} · {lastScan.deviceId || "Reader"}</small>
                </>
              ) : <span>Confirmed scans and rejections will appear here.</span>}
              {lastScan?.message && !lastScan.success && <small>{lastScan.message}</small>}
            </div>
          </div>
        </div>

        <form className="live-test-scan" onSubmit={handleTestScan}>
          <div className="live-test-copy">
            <h3>Test Scan</h3>
            <p>Read-only check. It won&apos;t record attendance or change reader status.</p>
          </div>
          <label className="live-test-input-label" htmlFor="test-rfid-uid">RFID UID</label>
          <div className="live-test-controls">
            <input
              id="test-rfid-uid"
              className="field live-test-input"
              value={testUid}
              onChange={(event) => setTestUid(event.target.value.toUpperCase())}
              placeholder="Enter a card UID"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-secondary live-action-button" disabled={scanning || !testUid.trim()}>
              {scanning ? <Loader2 className="live-loading-icon" size={16} /> : <Search size={16} />}
              {scanning ? "Checking" : "Test Scan"}
            </button>
          </div>
          {testResult && (
            <div className={`live-test-result ${testResult.recognized ? "is-success" : "is-rejected"}`} role="status">
              {testResult.recognized ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
              <span>
                <strong>{testResult.studentName || testResult.message}</strong>
                {testResult.studentName && <small>{testResult.studentCode} · Today: {testResult.attendanceStatus || "Unmarked"} · {testResult.uid}</small>}
              </span>
            </div>
          )}
        </form>

        <details className="live-session-settings">
          <summary>Session Settings</summary>
          <div className="live-settings-grid">
            <label>
              <span>Attendance date</span>
              <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span>Department</span>
              <select className="field" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}
              </select>
            </label>
            <label>
              <span>Course</span>
              <select className="field" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">All courses</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            <label>
              <span>Subject</span>
              <select className="field" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">Default schedule</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectCode} · {subject.subjectName}</option>)}
              </select>
            </label>
            <label>
              <span>Reader used for manual records</span>
              <select className="field" value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
                <option value="">No reader selected</option>
                {devices.map((device) => <option key={device.id} value={device.deviceId}>{device.name} · {device.deviceId}</option>)}
              </select>
            </label>
          </div>
        </details>
      </section>

      <section className="live-section live-list-section" aria-labelledby="live-list-title">
        <div className="live-section-heading live-list-heading">
          <div>
            <h2 id="live-list-title">Attendance List</h2>
            <p>{loading ? "Loading students…" : `${filteredStudents.length} students`}</p>
          </div>
          <div className="live-list-filters">
            <label className="live-search" htmlFor="attendance-search">
              <Search size={17} aria-hidden="true" />
              <input id="attendance-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" />
            </label>
            <label className="live-status-filter">
              <span className="sr-only">Filter by attendance status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All</option>
                <option>Present</option>
                <option>Absent</option>
                <option>Unmarked</option>
                <option>Late</option>
                <option>Half Day</option>
                <option>Leave</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="live-list-loading"><Loader2 className="live-loading-icon" size={20} /> Loading attendance records…</div>
        ) : filteredStudents.length === 0 ? (
          <div className="live-list-empty">
            <Users size={24} />
            <strong>{students.length ? "No students match these filters" : "No active students found"}</strong>
            <span>{students.length ? "Try a different name, roll number, or status." : "Active students will appear here when they are added."}</span>
          </div>
        ) : (
          <div className="live-table-scroll">
            <table className="live-attendance-table">
              <thead>
                <tr>
                  <th scope="col">Student name</th>
                  <th scope="col">Roll number</th>
                  <th scope="col">Status</th>
                  <th scope="col">Check-in time</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const canMark = ["Absent", "Unmarked"].includes(student.attendanceStatus);
                  const busy = markingId === student.id;
                  return (
                    <tr key={student.id}>
                      <td>
                        <div className="live-student-name">
                          <span>{student.name.charAt(0).toUpperCase()}</span>
                          <div><strong>{student.name}</strong><small>{student.course} · Semester {student.semester}</small></div>
                        </div>
                      </td>
                      <td className="live-roll-number">{student.studentCode}</td>
                      <td><StatusBadge status={student.attendanceStatus} /></td>
                      <td className="live-check-in">{student.entryTime || "—"}</td>
                      <td>
                        {canMark ? (
                          <button
                            type="button"
                            className="live-row-action"
                            onClick={() => void markPresent(student)}
                            disabled={!sessionActive || busy}
                            aria-label={`Manually mark ${student.name} present`}
                          >
                            {busy ? <Loader2 className="live-loading-icon" size={15} /> : <UserCheck size={15} />}
                            {busy ? "Saving" : "Mark present"}
                          </button>
                        ) : <span className="live-recorded-action">Recorded</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
