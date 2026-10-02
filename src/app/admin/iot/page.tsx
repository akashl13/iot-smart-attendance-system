"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, HardDrive, Radio, RefreshCw, Send, ShieldCheck, Sparkles, UserCheck, Wifi } from "lucide-react";
import { RFIDScannerCard } from "@/components/rfid-scanner";
import { LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/providers";
import { api, apiRaw } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";

type Device = {
  id: number;
  deviceId: string;
  name: string;
  location: string;
  ipAddress: string | null;
  status: string;
  lastSeen: string | null;
  firmwareVersion: string | null;
};

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

export default function IotPage() {
  const toast = useToast();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [uid, setUid] = useState("A3 7F 21 9C");
  const [deviceId, setDeviceId] = useState("NODEMCU-01");
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState("Checking");
  const [lastRequest, setLastRequest] = useState<unknown>(null);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  async function load() {
    const [deviceRes, scanRes, healthRes] = await Promise.all([
      api<{ data: Device[] }>("/api/devices"),
      api<{ data: Scan[] }>("/api/scans?limit=10"),
      fetch("/api/health").then((res) => res.json()).catch(() => ({ ok: false })),
    ]);
    setDevices(deviceRes.data);
    setScans(scanRes.data);
    setHealth(healthRes.ok ? "API Operational" : "API Unreachable");
  }

  useEffect(() => {
    const start = setTimeout(() => { void load().catch((error) => toast.error(error.message)); }, 0);
    const id = setInterval(() => void load().catch(() => undefined), 4000);
    return () => { clearTimeout(start); clearInterval(id); };
  }, [toast]);

  async function simulate() {
    const payload = { rfidUID: uid, deviceId };
    setLastRequest(payload);
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const result = await apiRaw("/api/rfid/scan", { method: "POST", body: JSON.stringify(payload) });
      setLastResponse(result.data);
      if (result.data.success) {
        toast.success(result.data.message || "Attendance recorded successfully");
      } else {
        toast.error(result.data.message || "Card scan rejected");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!devices.length && health === "Checking") return <LoadingState label="Connecting to IoT telemetry network" />;
  const result = lastResponse as { success?: boolean; studentName?: string; studentId?: string; status?: string; scanType?: string; entryTime?: string; exitTime?: string; message?: string } | null;

  const onlineDevicesCount = devices.filter((d) => d.status === "ONLINE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IoT Telemetry & Control"
        title="Hardware Control Center"
        subtitle="Live telemetry for physical ESP8266 readers, wireless network presence, and real-time attendance scan stream."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance/live"
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-sm text-white text-xs flex items-center gap-1.5"
            >
              <Radio size={14} className="animate-pulse" /> Start Attendance Session
            </Link>
            <button onClick={() => load()} className="btn btn-ghost text-xs flex items-center gap-1.5 border border-slate-200">
              <RefreshCw size={14} /> Refresh Telemetry
            </button>
          </div>
        }
      />

      {/* KPI Top Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">API Status</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{health}</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">POST /api/rfid/scan</p>
        </div>

        <div className="panel p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Readers</span>
            <Wifi size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {onlineDevicesCount} / {devices.length} Online
          </p>
          <p className="mt-1 text-xs text-slate-500">Heartbeat frequency: 60s</p>
        </div>

        <div className="panel p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Physical NodeMCU</span>
            <Cpu size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {devices.find((d) => d.deviceId === "NODEMCU-01")?.status === "ONLINE" ? "Connected 🟢" : "Waiting..."}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            IP: {devices.find((d) => d.deviceId === "NODEMCU-01")?.ipAddress || "192.168.1.x"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {/* Left Column: Interactive Scanner Bench */}
        <div className="space-y-5">
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" /> RFID Simulator Bench
              </h3>
              <span className="text-xs text-slate-400 font-medium">Virtual Reader</span>
            </div>

            <RFIDScannerCard
              uid={uid}
              scanning={busy}
              onChange={setUid}
              onScan={simulate}
              actionLabel="Trigger Test Card Tap"
              caption={deviceId}
            />

            <label className="block">
              <span className="label">Target Gate / Device</span>
              <select
                className="field"
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.deviceId}>
                    {device.deviceId} · {device.name} ({device.status})
                  </option>
                ))}
                {!devices.some((device) => device.deviceId === "NODEMCU-01") && (
                  <option value="NODEMCU-01">NODEMCU-01 · Physical Board</option>
                )}
              </select>
            </label>
          </div>

          {/* Result Card */}
          <div className="panel p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 mb-3">
              Last Scan Processing Result
            </h3>
            {result ? (
              <div className="space-y-4">
                <div
                  className={`rounded-xl p-4 border ${
                    result.success
                      ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
                      : "bg-rose-50/70 border-rose-200/80 text-rose-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold">
                      {result.success ? "✅ Scan Accepted & Processed" : "⚠️ Scan Rejected"}
                    </p>
                    <StatusBadge status={result.status || (result.success ? "ENTRY" : "Rejected")} />
                  </div>
                  <p className="mt-1 text-xs opacity-90">{result.message || "Attendance recorded."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400">Student Name</span>
                    <p className="font-semibold text-slate-800">{result.studentName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Student Code</span>
                    <p className="font-mono font-semibold text-slate-800">{result.studentId || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Card UID</span>
                    <p className="font-mono text-xs font-bold text-indigo-600">{uid}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Timestamp</span>
                    <p className="font-medium text-slate-700">{result.entryTime || result.exitTime || "Just now"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                Tap your physical RFID card on your reader or click &quot;Trigger Test Card Tap&quot; above to view live parsing.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hardware Telemetry & Real-Time Scans */}
        <div className="space-y-5">
          {/* Device Registry Status */}
          <div className="panel p-5">
            <h3 className="text-base font-bold tracking-tight text-slate-900 mb-4 flex items-center justify-between">
              <span>Connected Hardware Devices</span>
              <span className="text-xs font-semibold text-slate-500 font-normal">
                Automatic offline timeout: 3 mins
              </span>
            </h3>

            <div className="space-y-3">
              {devices.map((device) => {
                const isPhysical = device.deviceId === "NODEMCU-01";
                const isOnline = device.status === "ONLINE";
                return (
                  <div
                    key={device.id}
                    className={`rounded-xl p-4 border transition-all ${
                      isPhysical && isOnline
                        ? "bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-emerald-300 shadow-sm"
                        : isOnline
                        ? "bg-white border-slate-200"
                        : "bg-slate-50/60 border-slate-200/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-slate-900">{device.deviceId}</span>
                        {isPhysical && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            Physical Board ⚡
                          </span>
                        )}
                      </div>
                      <StatusBadge status={device.status} />
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-700">
                      {device.name} · <span className="text-slate-500">{device.location}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-[11px] font-mono text-slate-500 border-t border-slate-200/50 pt-2">
                      <span>IP: {device.ipAddress || "DHCP"}</span>
                      <span>FW: v{device.firmwareVersion || "1.0.0"}</span>
                      <span className="text-slate-400">Seen: {formatRelative(device.lastSeen)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Scan Feed */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold tracking-tight text-slate-900">Live RFID Scan Activity</h3>
              <span className="text-xs text-slate-500 font-medium">Auto-updating</span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {scans.length > 0 ? (
                scans.map((scan) => {
                  const isUnregistered = !scan.studentName;
                  return (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {scan.studentName || "Unassigned RFID Card"}
                          </p>
                          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-600 border border-slate-200">
                            {scan.rfidUid}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {scan.time || "Just now"} · {scan.deviceId || "NODEMCU-01"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isUnregistered && (
                          <button
                            onClick={() => router.push(`/admin/students`)}
                            className="btn btn-ghost px-2 py-1 text-[11px] text-indigo-600 hover:text-indigo-700"
                          >
                            Assign
                          </button>
                        )}
                        <StatusBadge status={scan.success ? scan.status || "OK" : "Rejected"} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">No scan records yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
