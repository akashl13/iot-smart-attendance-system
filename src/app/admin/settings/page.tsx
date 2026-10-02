"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { Field, LoadingState, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Settings = { institutionName: string; academicYear: string; campusName: string; lateAfter: string; cooldownSeconds: number; halfDayHours: number; lowAttendance: number };

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => { api<{ settings: Settings }>("/api/settings").then((res) => setForm(res.settings)).catch((error) => toast.error(error.message)); }, [toast]);

  async function save() {
    if (!form) return;
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(form) });
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save settings");
    }
  }

  async function changePassword() {
    try {
      await api("/api/auth/password", { method: "PUT", body: JSON.stringify(password) });
      toast.success("Password updated.");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Password update failed");
    }
  }

  if (!form) return <LoadingState />;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="panel p-5">
        <PageHeader eyebrow="Policy" title="Settings" subtitle="These values are read by the RFID scan service. They are not hardcoded in the scanner." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institution"><input className="field" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></Field>
          <Field label="Campus"><input className="field" value={form.campusName} onChange={(e) => setForm({ ...form, campusName: e.target.value })} /></Field>
          <Field label="Academic year"><input className="field" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
          <Field label="Late after"><input className="field" type="time" value={form.lateAfter} onChange={(e) => setForm({ ...form, lateAfter: e.target.value })} /></Field>
          <Field label="Cooldown seconds"><input className="field" type="number" value={form.cooldownSeconds} onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })} /></Field>
          <Field label="Half-day hours"><input className="field" type="number" value={form.halfDayHours} onChange={(e) => setForm({ ...form, halfDayHours: Number(e.target.value) })} /></Field>
          <Field label="Low attendance %"><input className="field" type="number" value={form.lowAttendance} onChange={(e) => setForm({ ...form, lowAttendance: Number(e.target.value) })} /></Field>
        </div>
        <button className="btn btn-primary mt-5" onClick={save}>Save settings</button>
      </section>
      <section className="panel p-5">
        <h2 className="font-display text-3xl">Administrator password</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Current"><input className="field" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></Field>
          <Field label="New"><input className="field" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></Field>
          <Field label="Confirm"><input className="field" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></Field>
          <button className="btn btn-ghost" onClick={changePassword}>Update password</button>
        </div>
      </section>
    </div>
  );
}
