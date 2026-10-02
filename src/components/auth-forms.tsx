"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RFIDScannerCard } from "@/components/rfid-scanner";
import { Field } from "@/components/ui";
import { useToast } from "@/components/providers";
import { ApiError, api } from "@/lib/api-client";

type Meta = {
  departments: { id: number; name: string; code: string }[];
  courses: { id: number; name: string; code: string; departmentId: number }[];
  semesters: { id: number; courseId: number; number: number; name: string }[];
  sections: { id: number; courseId: number; semesterNumber: number; name: string }[];
};

export function LoginForm({ initialRole, showDemo }: { initialRole: "admin" | "student"; showDemo: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [portal, setPortal] = useState(initialRole);
  const [email, setEmail] = useState(initialRole === "admin" ? "admin@smartattend.com" : "student@smartattend.com");
  const [password, setPassword] = useState(initialRole === "admin" ? "Admin@123" : "Student@123");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, portal }),
      });
      toast.success("Signed in successfully.");
      router.push(result.user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Invalid login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", minHeight: "100vh" }} className="lg:grid-cols-[1fr_1fr]">
      {/* Left panel */}
      <aside
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(160deg, #060d1f 0%, #0d1a30 55%, #060d1f 100%)",
          color: "white",
        }}
        className="hidden lg:block"
      >
        <img
          src="/images/bench.jpg"
          alt="Electronics workbench"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 60%, rgba(99,102,241,0.2) 0%, transparent 65%)" }} />

        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "2.5rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          >
            <ArrowLeft size={14} /> Back to overview
          </Link>

          <div>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
              <div style={{ width: "3rem", height: "3rem", borderRadius: "0.875rem", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
                  <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16.5" cy="12" r="1.5" fill="white" />
                </svg>
              </div>
              <div>
                <span style={{ display: "block", fontWeight: 700, fontSize: "1rem" }}>SmartAttend</span>
                <span style={{ display: "block", fontSize: "0.65rem", color: "rgba(165,180,252,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>Crestview University</span>
              </div>
            </div>

            <p style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#a5b4fc", marginBottom: "1rem" }}>Secure Access Portal</p>
            <h1
              className="font-display"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: "1.1", marginBottom: "1.25rem" }}
            >
              Sign in to the
              <br />
              <span style={{ background: "linear-gradient(135deg,#a5b4fc,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                attendance network.
              </span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: "1.7", fontSize: "0.9rem", maxWidth: "22rem" }}>
              Administrators land in the registrar console. Students land on their own attendance record.
            </p>

            {/* Feature chips */}
            <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {["JWT Auth", "Role-based", "RC522 RFID", "Real-time"].map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    color: "#a5b4fc",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Asia/Kolkata clock · RC522 · ESP8266</p>
        </div>
      </aside>

      {/* Right panel — form */}
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5rem 1.5rem", background: "#f8fafc" }}>
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: "26rem" }}
        >
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", color: "#64748b", fontSize: "0.8rem" }} className="lg:hidden">
            <ArrowLeft size={13} /> Back
          </Link>

          <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "2.25rem", marginBottom: "0.35rem" }}>Welcome back</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b" }}>Use the portal that matches your role.</p>
          </div>

          {/* Role toggle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "white",
              borderRadius: "1rem",
              padding: "0.3rem",
              border: "1.5px solid #e2e8f0",
              marginBottom: "1.5rem",
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            }}
          >
            {(["student", "admin"] as const).map((role) => (
              <button
                type="button"
                key={role}
                onClick={() => {
                  setPortal(role);
                  setEmail(role === "admin" ? "admin@smartattend.com" : "student@smartattend.com");
                  setPassword(role === "admin" ? "Admin@123" : "Student@123");
                }}
                style={{
                  borderRadius: "0.75rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: portal === role ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
                  color: portal === role ? "white" : "#64748b",
                  boxShadow: portal === role ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                }}
              >
                {role === "admin" ? "🔑 Admin" : "🎓 Student"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label className="label">Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input
                  className="field"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <button
            className="btn btn-tide"
            style={{ width: "100%", padding: "0.8rem 1rem", fontSize: "0.9rem" }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>Sign in <ArrowRight size={16} /></>
            )}
          </button>

          <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "#64748b" }}>
            New student?{" "}
            <Link href="/register" style={{ fontWeight: 700, color: "#6366f1", textDecoration: "none" }}>
              Create an account
            </Link>
          </p>

          {showDemo && (
            <div
              style={{
                marginTop: "1.5rem",
                borderRadius: "1rem",
                border: "1.5px solid #e2e8f0",
                background: "white",
                padding: "1.1rem 1.25rem",
                fontSize: "0.8rem",
              }}
            >
              <p style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.9rem" }}>🔓</span> Demo credentials
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem" }}>
                <p><span style={{ color: "#6366f1", fontWeight: 600 }}>Admin</span> · admin@smartattend.com · Admin@123</p>
                <p><span style={{ color: "#10b981", fontWeight: 600 }}>Student</span> · student@smartattend.com · Student@123</p>
                <p style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#94a3b8" }}>Akash Singh&apos;s card: A3 7F 21 9C</p>
              </div>
            </div>
          )}
        </motion.form>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const emptyForm = {
  name: "", studentId: "", email: "", phone: "", dateOfBirth: "", gender: "Male",
  departmentId: "", courseId: "", semester: "", section: "", enrollmentNumber: "",
  password: "", confirmPassword: "", rfidUID: "",
};

const stepMeta = [
  { label: "Personal", icon: "👤", desc: "Basic information" },
  { label: "Academic", icon: "🎓", desc: "Course details" },
  { label: "Account", icon: "🔒", desc: "Credentials" },
  { label: "RFID", icon: "📡", desc: "Card assignment" },
];

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Meta & { success: boolean }>("/api/meta")
      .then((res) => { if (!cancelled) setMeta(res); })
      .catch((error) => { if (!cancelled) toast.error(error.message); });
    return () => { cancelled = true; };
  }, [toast]);

  const courses = useMemo(() => meta?.courses.filter((c) => String(c.departmentId) === form.departmentId) ?? [], [meta, form.departmentId]);
  const semesters = useMemo(() => meta?.semesters.filter((s) => String(s.courseId) === form.courseId) ?? [], [meta, form.courseId]);
  const sections = useMemo(() => meta?.sections.filter((s) => String(s.courseId) === form.courseId && String(s.semesterNumber) === form.semester) ?? [], [meta, form.courseId, form.semester]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    if (step === 0 && (!form.name || !form.studentId || !form.email || !form.phone || !form.dateOfBirth)) return toast.error("Complete personal information.");
    if (step === 1 && (!form.departmentId || !form.courseId || !form.semester || !form.section || !form.enrollmentNumber)) return toast.error("Complete academic information.");
    if (step === 2 && (form.password.length < 8 || form.password !== form.confirmPassword)) return toast.error("Password must match and be at least 8 characters.");
    setStep((v) => Math.min(3, v + 1));
  }

  async function scan() {
    setScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 1100));
      const result = await api<{ rfidUID: string }>("/api/rfid/next-uid");
      set("rfidUID", result.rfidUID);
      toast.success("Card read. UID reserved for this registration.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function submit() {
    if (!form.rfidUID) return toast.error("Scan or enter an RFID UID.");
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, departmentId: Number(form.departmentId), courseId: Number(form.courseId), semester: Number(form.semester) }),
      });
      toast.success("Registration completed. Sign in to continue.");
      router.push("/login?role=student");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "0 1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top bar */}
      <div style={{ width: "100%", maxWidth: "52rem", paddingTop: "2rem", paddingBottom: "0.5rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            textDecoration: "none",
            color: "#64748b",
            fontSize: "0.825rem",
            fontWeight: 600,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#6366f1")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          <ArrowLeft size={14} /> Overview
        </Link>
      </div>

      <div style={{ width: "100%", maxWidth: "52rem", paddingBottom: "4rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="font-display" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "0.5rem" }}>
            Student Registration
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
            Four steps. The RFID UID is checked for duplicates before the account is created.
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.75rem" }}>
          {stepMeta.map(({ label, icon, desc }, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <div
                key={label}
                style={{
                  borderRadius: "1rem",
                  padding: "0.875rem 1rem",
                  border: `1.5px solid ${active ? "#6366f1" : done ? "#10b981" : "#e2e8f0"}`,
                  background: active
                    ? "linear-gradient(135deg, #eef2ff, #e0e7ff)"
                    : done
                    ? "linear-gradient(135deg, #d1fae5, #a7f3d0)"
                    : "white",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{done ? "✅" : icon}</div>
                <span className="font-mono" style={{ fontSize: "0.65rem", color: active ? "#6366f1" : done ? "#059669" : "#94a3b8", fontWeight: 700 }}>
                  {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: active ? "#4f46e5" : done ? "#065f46" : "#94a3b8", lineHeight: "1.2", marginTop: "0.15rem" }}>
                  {label}
                </p>
                <p style={{ fontSize: "0.68rem", color: active ? "#6366f1" : "#94a3b8", marginTop: "0.15rem" }}>{desc}</p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", borderRadius: "999px", background: "#e2e8f0", marginBottom: "1.75rem", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #6366f1, #a5b4fc)",
              width: `${((step + 1) / 4) * 100}%`,
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        {/* Form panel */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="panel"
          style={{ padding: "2rem" }}
        >
          {/* Step 0: Personal */}
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
              <Field label="Full name"><input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Akash Singh" /></Field>
              <Field label="Student ID"><input className="field" value={form.studentId} onChange={(e) => set("studentId", e.target.value.toUpperCase())} placeholder="CU12400" /></Field>
              <Field label="Email"><input className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="akash@university.edu" /></Field>
              <Field label="Phone"><input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></Field>
              <Field label="Date of birth"><input className="field" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
              <Field label="Gender">
                <select className="field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
            </div>
          )}

          {/* Step 1: Academic */}
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
              <Field label="Department">
                <select className="field" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, courseId: "", semester: "", section: "" }))}>
                  <option value="">Select department</option>
                  {meta?.departments.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
                </select>
              </Field>
              <Field label="Course">
                <select className="field" value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value, semester: "", section: "" }))}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Semester">
                <select className="field" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value, section: "" }))}>
                  <option value="">Select semester</option>
                  {semesters.map((s) => <option key={s.id} value={s.number}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Section">
                <select className="field" value={form.section} onChange={(e) => set("section", e.target.value)}>
                  <option value="">Select section</option>
                  {sections.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Enrollment number">
                <input className="field" value={form.enrollmentNumber} onChange={(e) => set("enrollmentNumber", e.target.value.toUpperCase())} placeholder="CU2025MCA001" />
              </Field>
            </div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
              <Field label="Email (from step 1)">
                <input className="field" value={form.email} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
              </Field>
              <div />
              <Field label="Password">
                <input className="field" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 characters" />
              </Field>
              <Field label="Confirm password">
                <input className="field" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} placeholder="Repeat password" />
              </Field>
            </div>
          )}

          {/* Step 3: RFID */}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center" }} className="grid-cols-1 lg:grid-cols-2">
              <div>
                <h3 className="font-display" style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Scan your RFID card</h3>
                <p style={{ fontSize: "0.875rem", lineHeight: "1.7", color: "#64748b", marginBottom: "1rem" }}>
                  The development scanner animates a read and asks the server for an unused UID. A physical NodeMCU will later post the real UID to the same registration check.
                </p>
                <div style={{ borderRadius: "1rem", background: "#eef2ff", border: "1px solid #c7d2fe", padding: "1rem", fontSize: "0.8rem", color: "#4f46e5" }}>
                  <p style={{ fontWeight: 700, marginBottom: "0.25rem" }}>💡 How it works</p>
                  <p>The UID is reserved on the server as soon as it is scanned, preventing concurrent duplicate registrations.</p>
                </div>
              </div>
              <RFIDScannerCard uid={form.rfidUID} scanning={scanning} onScan={scan} onChange={(v) => set("rfidUID", v)} />
            </div>
          )}

          {/* Navigation */}
          <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
            <button
              type="button"
              className="btn btn-ghost-dark"
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0}
            >
              <ArrowLeft size={15} /> Back
            </button>
            {step < 3 ? (
              <button type="button" className="btn btn-tide" onClick={next}>
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" className="btn btn-tide" onClick={submit} disabled={loading} style={{ minWidth: "11rem" }}>
                {loading ? "Creating account..." : <><Check size={15} /> Finish registration</>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
