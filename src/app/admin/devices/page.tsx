"use client";

import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/providers";
import { Field, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";

type Device = { id: number; deviceId: string; name: string; location: string; ipAddress: string | null; status: string; trustState: string; lastSeen: string | null; firmwareVersion: string | null };
const blank = { deviceId: "", name: "", location: "", ipAddress: "", firmwareVersion: "1.0.0", status: "OFFLINE", trustState: "ACTIVE" };

export default function DevicesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Device[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(blank);

  async function load() {
    const res = await api<{ data: Device[] }>("/api/devices");
    setRows(res.data);
  }
  useEffect(() => {
    const start = setTimeout(() => { void load().catch((error) => toast.error(error.message)); }, 0);
    const id = setInterval(() => void load().catch(() => undefined), 15000);
    return () => { clearTimeout(start); clearInterval(id); };
  }, [toast]);

  async function save() {
    try {
      if (editing) await api(`/api/devices/${editing}`, { method: "PUT", body: JSON.stringify(form) });
      else await api("/api/devices", { method: "POST", body: JSON.stringify(form) });
      toast.success("Device saved.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    }
  }

  async function ping(device: Device) {
    await api("/api/devices/heartbeat", { method: "POST", body: JSON.stringify({ deviceId: device.deviceId, ipAddress: device.ipAddress || "192.168.1.20", firmwareVersion: device.firmwareVersion }) });
    toast.success(`${device.deviceId} heartbeat accepted.`);
    await load();
  }

  return (
    <div>
      <PageHeader eyebrow="Hardware" title="IoT devices" subtitle="Readers announce themselves with POST /api/devices/heartbeat. A unit is offline if it has been silent for three minutes." action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>Register device</button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((device) => (
          <article key={device.id} className="panel p-5">
            <div className="flex items-start justify-between"><div><p className="font-mono text-xs text-brass">{device.deviceId}</p><h2 className="mt-1 font-display text-3xl">{device.name}</h2></div><StatusBadge status={device.status} /></div>
            <p className="mt-3 text-sm text-slate-600">{device.location}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{device.ipAddress || "No IP"} · fw {device.firmwareVersion || "—"}</p>
            <p className="mt-2 text-sm">
              Trust: <span className={device.trustState === "ACTIVE" ? "text-emerald-700" : "text-rose-700"}>{device.trustState}</span>
              {device.trustState !== "ACTIVE" ? " · scans refused until approved" : ""}
            </p>
            <p className="mt-2 text-sm">Last seen {formatRelative(device.lastSeen)}</p>
            <div className="mt-4 flex gap-2">
              <button className="btn btn-ghost" onClick={() => ping(device)}>Heartbeat</button>
              <button className="btn btn-ghost" onClick={() => { setEditing(device.id); setForm({ deviceId: device.deviceId, name: device.name, location: device.location, ipAddress: device.ipAddress || "", firmwareVersion: device.firmwareVersion || "", status: device.status, trustState: device.trustState }); setOpen(true); }}>Edit</button>
              <button className="btn btn-ghost" onClick={async () => { if (await confirm({ title: "Remove device?", message: device.deviceId, danger: true, confirmLabel: "Remove" })) { await api(`/api/devices/${device.id}`, { method: "DELETE" }); toast.success("Device removed."); load(); } }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      <Modal open={open} title={editing ? "Edit device" : "Register device"} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <Field label="Device ID"><input className="field" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value.toUpperCase() })} /></Field>
          <Field label="Name"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Location"><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="IP address"><input className="field" value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} /></Field>
          <Field label="Firmware"><input className="field" value={form.firmwareVersion} onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })} /></Field>
          <Field label="Status"><select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ONLINE</option><option>OFFLINE</option></select></Field>
          <Field label="Trust state"><select className="field" value={form.trustState} onChange={(e) => setForm({ ...form, trustState: e.target.value })}><option>ACTIVE</option><option>PENDING</option><option>SUSPENDED</option></select></Field>
          <p className="text-xs text-slate-500">Only an ACTIVE reader may mark attendance. PENDING and SUSPENDED readers are refused by the scan API.</p>
        </div>
        <button className="btn btn-primary mt-5" onClick={save}>Save device</button>
      </Modal>
    </div>
  );
}
