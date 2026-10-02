"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Mail,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useConfirm, useToast } from "@/components/providers";
import { RFIDScannerCard } from "@/components/rfid-scanner";
import { DataTable, Field, LoadingState, Modal, PageHeader, Pagination, SearchBar, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Card = {
  id: number;
  uid: string;
  studentName: string | null;
  studentId: string | null;
  studentDbId: number | null;
  registeredAt: string;
  status: string;
  lastScan: string;
  device: string;
};

type Student = { id: number; studentId: string; name: string };

type StudentLookupResult = {
  found: boolean;
  registered: boolean;
  uid: string;
  message?: string;
  card?: { uid: string; status: string; registeredAt?: string } | null;
  student?: {
    id: number;
    studentCode: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    departmentCode: string;
    course: string;
    semester: number;
    section: string;
    status: string;
    rfidUid: string | null;
    attendancePercentage: number;
    todayStatus: string;
    entryTime: string;
    exitTime: string;
  } | null;
  recentScans?: { id: number; time: string; deviceId: string | null; success: boolean; message: string | null; status: string | null }[];
};

export default function RfidPage() {
  const toast = useToast();
  const confirm = useConfirm();

  // Table state
  const [rows, setRows] = useState<Card[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Registration modal
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [studentId, setStudentId] = useState("");
  const [scanning, setScanning] = useState(false);

  // History modal
  const [history, setHistory] = useState<{ id: number; time: string; deviceId: string | null; success: boolean; message: string | null; status: string | null }[]>([]);
  const [historyUid, setHistoryUid] = useState("");

  // Scan & Identify Student section
  const [lookupUid, setLookupUid] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<StudentLookupResult | null>(null);
  const [autoListen, setAutoListen] = useState(true);
  const [readerError, setReaderError] = useState("");
  const [scanPopup, setScanPopup] = useState<{
    uid: string;
    checking: boolean;
    result: StudentLookupResult | null;
    error: string | null;
  } | null>(null);

  const prevScanRef = useRef<number | null>(null);
  const pollingRef = useRef(false);

  async function load(next = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(next), search, status });
    try {
      const res = await api<{ data: Card[]; pages: number }>(`/api/rfid?${params}`);
      setRows(res.data);
      setPages(res.pages);
      setLoadError("");
    } catch (error) {
      setRows([]);
      setLoadError(error instanceof Error ? error.message : "Could not load RFID cards.");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api<{ data: Student[] }>("/api/students?limit=100").then((res) => setStudents(res.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { void load(page).catch((error) => toast.error(error.message)); }, 0);
    return () => clearTimeout(id);
  }, [page, search, status]);

  // Lookup student by RFID UID
  async function performLookup(targetUid: string, notify = true): Promise<StudentLookupResult | null> {
    const cleanUid = targetUid.trim();
    if (!cleanUid) return null;
    setLookupLoading(true);
    try {
      const res = await api<StudentLookupResult>(`/api/rfid/lookup?uid=${encodeURIComponent(cleanUid)}`);
      setLookupResult(res);
      if (notify && res.found && res.student) {
        toast.success(`Identified: ${res.student.name} (${res.student.studentCode})`);
      } else if (notify) {
        toast.error(res.message || "Card is not registered to any student.");
      }
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to lookup card";
      if (notify) toast.error(message);
      return null;
    } finally {
      setLookupLoading(false);
    }
  }

  // Poll for each new scan from the physical NodeMCU, including unknown UIDs.
  useEffect(() => {
    if (!autoListen) return;
    let active = true;
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const scanRes = await api<{ data: { id: number; rfidUid: string; studentName: string | null }[] }>("/api/scans?limit=1");
        if (active) setReaderError("");
        const latest = scanRes.data?.[0];
        if (active && latest && prevScanRef.current !== null && latest.id !== prevScanRef.current) {
          prevScanRef.current = latest.id;
          setLookupUid(latest.rfidUid);
          setUid(latest.rfidUid);
          setScanPopup({ uid: latest.rfidUid, checking: true, result: null, error: null });
          const result = await performLookup(latest.rfidUid, false);
          if (active) {
            setScanPopup({
              uid: latest.rfidUid,
              checking: false,
              result,
              error: result ? null : "Could not check this card. Please try the scan again.",
            });
          }
        } else if (active && latest && prevScanRef.current === null) {
          prevScanRef.current = latest.id;
        }
      } catch (error) {
        if (active) setReaderError(error instanceof Error ? error.message : "Could not connect to the RFID scan feed.");
      } finally {
        pollingRef.current = false;
      }
    };
    void poll();
    const interval = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [autoListen]);

  async function register() {
    try {
      await api("/api/rfid/register", { method: "POST", body: JSON.stringify({ rfidUID: uid, studentId: Number(studentId) }) });
      toast.success("RFID card registered successfully.");
      setOpen(false);
      await load();
      // If we just registered the lookup card, refresh lookup
      if (lookupUid === uid) {
        performLookup(uid);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not register card");
    }
  }

  async function unassign(card: Card) {
    const ok = await confirm({ title: "Unassign card?", message: `${card.uid} will no longer mark attendance.`, confirmLabel: "Unassign", danger: true });
    if (!ok) return;
    await api(`/api/rfid/${encodeURIComponent(card.uid)}`, { method: "PUT", body: JSON.stringify({ studentId: null, status: "UNASSIGNED" }) });
    toast.success("Card unassigned.");
    await load();
    if (lookupResult?.uid === card.uid) {
      performLookup(card.uid);
    }
  }

  async function remove(card: Card) {
    const ok = await confirm({ title: "Delete RFID card?", message: "The card record will be removed.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await api(`/api/rfid/${encodeURIComponent(card.uid)}`, { method: "DELETE" });
    toast.success("Card removed.");
    await load();
    if (lookupResult?.uid === card.uid) {
      setLookupResult(null);
    }
  }

  async function showHistory(card: Card) {
    const res = await api<{ history: typeof history }>(`/api/rfid/${encodeURIComponent(card.uid)}`);
    setHistory(res.history);
    setHistoryUid(card.uid);
  }

  async function scan() {
    setAutoListen(true);
    toast.info("Tap the card on the physical NodeMCU reader. Its UID will appear here when detected.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cards & Identity"
        title="RFID Management & Student Identifier"
        subtitle="Scan or enter any RFID card to instantly identify the student, view today's attendance, and manage card assignments."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance/live"
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-sm text-white text-xs flex items-center gap-1.5"
            >
              <Radio size={14} className="animate-pulse" /> Live Attendance Mode
            </Link>
            <button className="btn btn-ghost border border-slate-200 text-xs" onClick={() => { setUid(""); setStudentId(""); setOpen(true); }}>
              <Plus size={14} /> Register New Card
            </button>
          </div>
        }
      />

      {/* ======================================================== */}
      {/* SECTION: SCAN RFID CARD & SEE WHICH STUDENT IT BELONGS TO */}
      {/* ======================================================== */}
      <section className="panel p-6 border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-sand shadow-sm space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ScanLine size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Scan RFID Card & Identify Student
              </h2>
              <p className="text-xs text-slate-500">
                Tap a card on the physical NodeMCU reader or enter its UID below to look up who it belongs to.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoListen(!autoListen)}
              className={`rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                autoListen
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-slate-100 border-slate-300 text-slate-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${autoListen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              Auto-detect Reader: {autoListen ? "ON" : "OFF"}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {autoListen ? "Listening for new scans sent by the NodeMCU. A detected card opens a result popup." : "Reader listening is paused. Turn auto-detect on to receive card scans."}
        </p>
        {readerError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">Reader scan feed error: {readerError}</p>}

        {/* Input Bar & Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <CreditCard className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              className="field pl-10 font-mono text-sm uppercase tracking-wider font-semibold"
              placeholder="Enter RFID UID (e.g. A3 7F 21 9C or 53 8A 12 7B)"
              value={lookupUid}
              onChange={(e) => setLookupUid(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") performLookup(lookupUid);
              }}
            />
          </div>

          <button
            disabled={lookupLoading || !lookupUid.trim()}
            onClick={() => performLookup(lookupUid)}
            className="btn btn-primary px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {lookupLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Identify Student
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Test Cards:</span>
          {rows.slice(0, 5).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setLookupUid(c.uid);
                performLookup(c.uid);
              }}
              className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs"
            >
              {c.studentName ? `${c.studentName.split(" ")[0]} (${c.uid})` : c.uid}
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* IDENTIFIED STUDENT DETAILS CARD (RESULT VIEW) */}
        {/* ======================================================== */}
        {lookupResult && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-3 duration-300">
            {lookupResult.found && lookupResult.student ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-md shadow-emerald-500/5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-2xl font-bold shadow-md">
                      {lookupResult.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          REGISTERED STUDENT ✅
                        </span>
                        <span className="font-mono text-xs text-slate-400">UID: {lookupResult.uid}</span>
                      </div>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">{lookupResult.student.name}</h3>
                      <p className="font-mono text-sm font-semibold text-indigo-600">
                        Roll No: {lookupResult.student.studentCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-400 font-semibold uppercase">Today&apos;s Status</span>
                      <StatusBadge status={lookupResult.student.todayStatus} />
                    </div>
                    <div className="border-l border-slate-200 pl-3 text-right">
                      <span className="block text-[11px] text-slate-400 font-semibold uppercase">Attendance Score</span>
                      <span className="text-lg font-bold text-teal-700">{lookupResult.student.attendancePercentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Profile Grid */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase block text-[10px]">Academic Program</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{lookupResult.student.course}</p>
                    <p className="text-slate-500">{lookupResult.student.department}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase block text-[10px]">Class & Semester</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">
                      Semester {lookupResult.student.semester}
                    </p>
                    <p className="text-slate-500">Section: {lookupResult.student.section || "A"}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase block text-[10px]">Contact Info</span>
                    <p className="font-medium text-slate-800 truncate mt-0.5 flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" /> {lookupResult.student.email}
                    </p>
                    <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone size={12} className="text-slate-400" /> {lookupResult.student.phone}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase block text-[10px]">Today&apos;s Entry Time</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                      <Clock size={13} className="text-emerald-600" />
                      {lookupResult.student.entryTime !== "—" ? lookupResult.student.entryTime : "Not yet checked in"}
                    </p>
                    <p className="text-slate-500">Exit: {lookupResult.student.exitTime}</p>
                  </div>
                </div>

                {/* Scan History for this Card */}
                {lookupResult.recentScans && lookupResult.recentScans.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Recent RFID Scans for this Card
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {lookupResult.recentScans.slice(0, 3).map((scan) => (
                        <div key={scan.id} className="rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>{scan.time || "Recent"}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600">{scan.deviceId || "NODEMCU-01"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* UNREGISTERED / UNASSIGNED CARD VIEW */
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                        NOT REGISTERED
                      </span>
                      <h4 className="mt-1 text-lg font-bold text-slate-900">
                        RFID card <span className="font-mono text-indigo-700">{lookupResult.uid}</span> is not registered to a student.
                      </h4>
                      <p className="text-xs text-slate-600">
                        Attendance was not marked for this card. Assign it to a student to enable attendance.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUid(lookupResult.uid);
                      setStudentId("");
                      setOpen(true);
                    }}
                    className="btn btn-primary px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-sm whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Assign This Card to a Student
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(scanPopup)}
        title="RFID Card Detected"
        subtitle="Physical NodeMCU reader scan"
        onClose={() => setScanPopup(null)}
      >
        {scanPopup && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">RFID Card ID</p>
              <p className="mt-2 break-all font-mono text-2xl font-bold tracking-wider text-slate-900">{scanPopup.uid}</p>
            </div>
            {scanPopup.checking ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-700">
                <RefreshCw size={16} className="animate-spin" /> Checking student registration…
              </div>
            ) : scanPopup.error ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{scanPopup.error}</div>
            ) : scanPopup.result?.found && scanPopup.result.student ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Registered student</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{scanPopup.result.student.name}</p>
                <p className="font-mono text-sm text-slate-600">{scanPopup.result.student.studentCode}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-lg font-extrabold text-rose-800">NOT REGISTERED</p>
                <p className="mt-1 text-sm text-rose-700">No student is assigned to this card. Attendance was not marked.</p>
              </div>
            )}
            <div className="flex justify-end">
              <button className="btn btn-ghost" onClick={() => setScanPopup(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* SECTION: ALL REGISTERED RFID CARDS TABLE */}
      {/* ======================================================== */}
      <div className="panel p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">All Registered RFID Cards Ledger</h3>
            <p className="text-xs text-slate-500">Every card registered in the attendance database.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search UID, student or roll..." />
            <select className="field text-xs sm:w-40" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All Statuses</option>
              <option>ASSIGNED</option>
              <option>UNASSIGNED</option>
              <option>BLOCKED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Could not load RFID cards: {loadError}</p>
        ) : (
          <DataTable
            rows={rows as unknown as Record<string, unknown>[]}
            columns={[
              {
                key: "uid",
                label: "RFID UID",
                render: (row) => (
                  <button
                    onClick={() => {
                      setLookupUid(String(row.uid));
                      performLookup(String(row.uid));
                    }}
                    className="font-mono text-xs font-bold text-indigo-600 hover:underline hover:text-indigo-800"
                    title="Click to identify student"
                  >
                    {String(row.uid)} 🔍
                  </button>
                ),
              },
              { key: "studentName", label: "Assigned Student" },
              { key: "studentId", label: "Roll No" },
              { key: "registeredAt", label: "Registered" },
              { key: "status", label: "Card Status", render: (row) => <StatusBadge status={String(row.status)} /> },
              { key: "lastScan", label: "Last Scan" },
              { key: "device", label: "Gate Device" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => {
                  const card = row as unknown as Card;
                  return (
                    <div className="flex gap-1.5">
                      <button
                        className="btn btn-ghost px-2.5 py-1.5 text-xs"
                        onClick={() => {
                          setLookupUid(card.uid);
                          performLookup(card.uid);
                        }}
                        title="Identify student"
                      >
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => showHistory(card)}>
                        History
                      </button>
                      <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => unassign(card)}>
                        Unassign
                      </button>
                      <button className="btn btn-ghost px-2.5 py-1.5 text-xs text-rose-600" onClick={() => remove(card)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {/* MODAL: ASSIGN CARD */}
      <Modal open={open} title="Assign RFID Card to Student" onClose={() => setOpen(false)}>
        <RFIDScannerCard uid={uid} scanning={scanning} onChange={setUid} onScan={scan} actionLabel="Listen for Physical Card" caption="NodeMCU reader" />
        <Field label="Assign to Student">
          <select className="field mt-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.studentId} · {student.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-primary mt-4 w-full justify-center" onClick={register}>
          Save Card Assignment
        </button>
      </Modal>

      {/* MODAL: SCAN HISTORY */}
      <Modal open={Boolean(historyUid)} title={`Scan History · ${historyUid}`} onClose={() => setHistoryUid("")}>
        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span>{item.time}</span>
                <span className="font-mono text-slate-500">{item.deviceId || "NODEMCU-01"}</span>
              </div>
              <p className="mt-1 text-slate-600">{item.success ? item.status || "Recorded" : item.message}</p>
            </div>
          ))}
          {!history.length && <p className="text-xs text-slate-500">No scans logged for this card.</p>}
        </div>
      </Modal>
    </div>
  );
}
