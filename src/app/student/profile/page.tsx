"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { Field, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Profile = { name: string; studentId: string; department: string; course: string; semester: number; section: string; email: string; phone: string; rfidUid: string | null; rfidStatus: string; enrollmentNumber: string; gender?: string; dateOfBirth?: string };

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  useEffect(() => { api<{ analytics: { profile: Profile } }>("/api/analytics/student").then((res) => setProfile(res.analytics.profile)).catch((error) => toast.error(error.message)); }, [toast]);

  async function changePassword() {
    try {
      await api("/api/auth/password", { method: "PUT", body: JSON.stringify(password) });
      toast.success("Password updated.");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Password update failed");
    }
  }

  if (!profile) return <LoadingState />;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel p-5">
        <PageHeader eyebrow="Identity" title={profile.name} subtitle="Profile details are maintained by the registrar. RFID status updates when a card is assigned." action={<StatusBadge status={profile.rfidStatus} />} />
        <dl className="grid gap-3 sm:grid-cols-2">
          {[["Student ID", profile.studentId], ["Enrollment", profile.enrollmentNumber], ["Department", profile.department], ["Course", profile.course], ["Semester", `${profile.semester} ${profile.section}`], ["Email", profile.email], ["Phone", profile.phone], ["Date of birth", profile.dateOfBirth || "—"], ["Gender", profile.gender || "—"], ["RFID UID", profile.rfidUid || "Not registered"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-sand p-3"><dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
          ))}
        </dl>
      </section>
      <section className="panel p-5">
        <h2 className="font-display text-3xl">Change password</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Current"><input className="field" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></Field>
          <Field label="New"><input className="field" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></Field>
          <Field label="Confirm"><input className="field" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></Field>
          <button className="btn btn-primary" onClick={changePassword}>Update password</button>
        </div>
      </section>
    </div>
  );
}
