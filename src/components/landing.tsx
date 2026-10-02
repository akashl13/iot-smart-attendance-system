"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Fingerprint,
  Globe,
  Lock,
  Menu,
  Radio,
  Shield,
  Timer,
  TrendingUp,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

/* ─── Data ─────────────────────────────────────────────── */
const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#rfid", label: "RFID" },
  { href: "#features", label: "Features" },
  { href: "/docs", label: "Docs" },
];

const pipeline = [
  { step: "01", title: "Card Tap", desc: "Student presents their MIFARE RFID card to the RC522 reader.", icon: "💳" },
  { step: "02", title: "UID Capture", desc: "13.56 MHz reader captures the unique identifier in under 50ms.", icon: "📡" },
  { step: "03", title: "Firmware", desc: "NodeMCU ESP8266 formats the UID and attaches the device ID.", icon: "🔌" },
  { step: "04", title: "API Endpoint", desc: "JSON payload hits /api/rfid/scan, validated and persisted instantly.", icon: "⚙️" },
];

const features = [
  { icon: Shield, title: "Role-based access", desc: "Administrators and students receive purpose-built consoles. Attendance records cannot be modified by students." },
  { icon: TrendingUp, title: "Entry & exit tracking", desc: "First valid scan marks entry. The next valid scan after the cooldown window marks exit." },
  { icon: Lock, title: "Duplicate protection", desc: "Repeated taps inside the cooldown window are rejected and logged with timestamps." },
  { icon: Bell, title: "Unknown card alerts", desc: "Unregistered UIDs never create attendance. Admins receive instant real-time notifications." },
  { icon: CheckCircle2, title: "Audit trail", desc: "Every admin edit is stored in an attendance modification log for full accountability." },
  { icon: Cpu, title: "Device heartbeat", desc: "NodeMCU units announce themselves. Stale readers are marked offline automatically." },
  { icon: BarChart3, title: "Report exports", desc: "Daily, monthly, per-student, department and subject reports export to CSV and PDF." },
  { icon: Globe, title: "Policy alerts", desc: "Students below the attendance threshold receive automatic, configurable notifications." },
];

const metrics = [
  { value: "45s", label: "Scan cooldown" },
  { value: "09:15", label: "Late cutoff IST" },
  { value: "75%", label: "Policy threshold" },
  { value: "<50ms", label: "UID read time" },
];

/* ─── Animation variants ────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

/* ─── Sub-components ────────────────────────────────────── */
function NavBar({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#0071e3", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
              <path d="M7 12h5" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16.5" cy="12" r="1.5" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", letterSpacing: "-0.022em" }}>
            SmartAttend
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="hidden md:flex">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", textDecoration: "none", letterSpacing: "-0.008em", transition: "color 0.18s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="hidden md:flex">
          <Link href="/login?role=student" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", textDecoration: "none", padding: "0.375rem 0.75rem", borderRadius: "980px", transition: "color 0.18s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          >
            Student
          </Link>
          <Link href="/login?role=admin" style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", background: "#0071e3", textDecoration: "none", padding: "0.4375rem 1.125rem", borderRadius: "980px", letterSpacing: "-0.01em", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#0077ed"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0071e3"; }}
          >
            Admin Login
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center" }} className="md:hidden" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "1.25rem 1.5rem", background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", textDecoration: "none" }} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <Link href="/login?role=admin" style={{ textAlign: "center", padding: "0.75rem", background: "#0071e3", color: "white", borderRadius: "12px", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 600 }}>
              Admin Login
            </Link>
            <Link href="/login?role=student" style={{ textAlign: "center", padding: "0.75rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "12px", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 400 }}>
              Student Login
            </Link>
            <Link href="/register" style={{ textAlign: "center", padding: "0.75rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.9375rem" }}>
              Register →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function RFIDMockup() {
  return (
    <div
      style={{
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 100px rgba(0,0,0,0.6)",
        maxWidth: "400px",
        width: "100%",
      }}
    >
      {/* Window chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 1.125rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
        <span style={{ flex: 1, textAlign: "center", fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em" }}>
          NODEMCU-01 · LIVE
        </span>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#30d158", animation: "pulse-ring 2.4s ease-in-out infinite" }} />
      </div>

      {/* Content */}
      <div style={{ padding: "1.5rem" }}>
        {/* UID display */}
        <div style={{ background: "#000", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: "0.625rem", fontFamily: "var(--font-mono, monospace)" }}>
            DETECTED UID
          </p>
          <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.875rem", letterSpacing: "0.22em", color: "white", fontWeight: 500, lineHeight: 1 }}>
            A3·7F·21·9C
          </p>
        </div>

        {/* Student card */}
        <div style={{ background: "rgba(0,113,227,0.1)", border: "1px solid rgba(0,113,227,0.2)", borderRadius: "12px", padding: "1rem 1.125rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #0071e3, #5e5ce6)", display: "grid", placeItems: "center", fontSize: "0.875rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
              AS
            </div>
            <div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em" }}>Akash Singh</p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "-0.003em" }}>CU12345 · CS — Sem 5</p>
            </div>
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ flex: 1, background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: "10px", padding: "0.75rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: "0.25rem" }}>Status</p>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#30d158" }}>✓ Present</p>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0.75rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: "0.25rem" }}>Type</p>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>Entry</p>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0.75rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: "0.25rem" }}>Time</p>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>08:54</p>
          </div>
        </div>

        {/* Tech tags */}
        <div style={{ display: "flex", gap: "0.375rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {["RC522", "ESP8266", "Wi-Fi 2.4GHz", "SPI Bus"].map(tag => (
            <span key={tag} style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: "980px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceChart() {
  const bars = [
    { day: "Mon", present: 92, late: 5, absent: 3 },
    { day: "Tue", present: 88, late: 7, absent: 5 },
    { day: "Wed", present: 95, late: 3, absent: 2 },
    { day: "Thu", present: 78, late: 11, absent: 11 },
    { day: "Fri", present: 85, late: 8, absent: 7 },
  ];

  return (
    <div style={{ background: "white", borderRadius: "18px", border: "1px solid rgba(0,0,0,0.07)", padding: "1.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#86868b", marginBottom: "0.25rem" }}>
            Weekly Overview
          </p>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em" }}>
            Attendance Rate
          </p>
        </div>
        <div style={{ background: "rgba(48,209,88,0.1)", borderRadius: "980px", padding: "0.25rem 0.75rem" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1a7f37" }}>↑ 87.6%</span>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: "100px", marginBottom: "0.625rem" }}>
        {bars.map(({ day, present, late, absent }) => (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "100%" }}>
            <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "2px" }}>
              <div style={{ width: "100%", height: `${present}%`, background: "#30d158", borderRadius: "4px 4px 0 0", minHeight: "4px" }} />
              <div style={{ width: "100%", height: `${late}%`, background: "#ff9f0a", minHeight: "2px" }} />
              <div style={{ width: "100%", height: `${absent}%`, background: "#ff3b30", borderRadius: "0 0 4px 4px", minHeight: "2px" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {bars.map(({ day }) => (
          <div key={day} style={{ flex: 1, textAlign: "center", fontSize: "0.6875rem", color: "#86868b", fontWeight: 500 }}>{day}</div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", paddingTop: "0.875rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[["#30d158", "Present"], ["#ff9f0a", "Late"], ["#ff3b30", "Absent"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.75rem", color: "#86868b", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export function LandingPage() {
  const [open, setOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", color: "#1d1d1f", overflowX: "hidden" }}>
      <NavBar open={open} setOpen={setOpen} />

      {/* ── HERO ──────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          background: "#000000",
          position: "relative",
          overflow: "hidden",
          padding: "8rem 1.5rem 5rem",
        }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Glow */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "900px", height: "500px", background: "radial-gradient(ellipse, rgba(0,113,227,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "60%", left: "30%", width: "400px", height: "300px", background: "radial-gradient(ellipse, rgba(94,92,230,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }} className="hero-grid-cols">
          {/* Left */}
          <motion.div style={{ opacity: heroOpacity, y: heroY }}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,113,227,0.12)", border: "1px solid rgba(0,113,227,0.25)", borderRadius: "980px", padding: "0.3rem 0.875rem", marginBottom: "2rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0071e3", animation: "pulse-ring 2s infinite" }} />
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4db3ff", letterSpacing: "-0.005em" }}>
                  University IoT Platform · 2025–26
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} style={{
                fontSize: "clamp(2.75rem, 5.5vw, 4.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.03,
                color: "white",
                marginBottom: "1.5rem",
              }}>
                Smart attendance,{" "}
                <span style={{
                  background: "linear-gradient(120deg, #4db3ff 0%, #0071e3 40%, #5e5ce6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  powered by IoT.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} style={{
                fontSize: "1.125rem",
                color: "rgba(255,255,255,0.48)",
                lineHeight: 1.65,
                letterSpacing: "-0.012em",
                maxWidth: "460px",
                marginBottom: "2.5rem",
              }}>
                Automated RFID attendance for modern universities. Real-time cloud sync,
                role-based dashboards, and full audit trails — out of the box.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "3.5rem" }}>
                <Link href="/login?role=admin" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  background: "#0071e3", color: "white", textDecoration: "none",
                  padding: "0.8125rem 1.625rem", borderRadius: "980px",
                  fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.012em",
                  transition: "all 0.2s ease", boxShadow: "0 0 0 0 rgba(0,113,227,0.4)",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0077ed"; e.currentTarget.style.boxShadow = "0 0 0 6px rgba(0,113,227,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0071e3"; e.currentTarget.style.boxShadow = "0 0 0 0 rgba(0,113,227,0.4)"; }}
                >
                  Get started <ArrowRight size={15} />
                </Link>
                <Link href="#how" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)", textDecoration: "none",
                  padding: "0.8125rem 1.375rem", borderRadius: "980px",
                  fontSize: "0.9375rem", fontWeight: 500, letterSpacing: "-0.012em",
                  transition: "all 0.2s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                >
                  See how it works
                </Link>
              </motion.div>

              {/* Metrics row */}
              <motion.div variants={fadeUp} style={{ display: "flex", gap: "2rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
                {metrics.map(({ value, label }) => (
                  <div key={label}>
                    <p style={{ fontSize: "1.625rem", fontWeight: 700, color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: "0.3rem", fontWeight: 500, letterSpacing: "0.01em" }}>{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right — RFID mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            style={{ display: "flex", justifyContent: "center" }}
            className="hero-mockup"
          >
            <RFIDMockup />
          </motion.div>
        </div>
      </motion.section>

      {/* ── LOGOS / TRUST BAR ─────────────────────────────── */}
      <section style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.75rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "3rem", flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)" }}>
            Built with
          </p>
          {["Next.js 16", "PostgreSQL", "Drizzle ORM", "ESP8266", "RC522"].map(tech => (
            <span key={tech} style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "-0.005em" }}>{tech}</span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how" style={{ background: "#f5f5f7", padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            style={{ textAlign: "center", marginBottom: "4rem" }}
          >
            <motion.span variants={fadeUp} style={{ display: "inline-block", fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", letterSpacing: "-0.005em", marginBottom: "0.875rem" }}>
              How it works
            </motion.span>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.035em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "0.875rem" }}>
              From card tap to verified record.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: "1.0625rem", color: "#6e6e73", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6, letterSpacing: "-0.012em" }}>
              The entire pipeline is automated — physical hardware to cloud database in under 200ms.
            </motion.p>
          </motion.div>

          {/* Pipeline steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5px", background: "rgba(0,0,0,0.08)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
            {pipeline.map(({ step, title, desc, icon }, i) => (
              <motion.div
                key={step}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1 }}
                style={{ background: "white", padding: "2rem", position: "relative" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "1.25rem", lineHeight: 1 }}>{icon}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.625rem", marginBottom: "0.625rem" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#0071e3", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em" }}>{step}</span>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.018em" }}>{title}</h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#6e6e73", lineHeight: 1.6, letterSpacing: "-0.008em" }}>{desc}</p>
                {i < pipeline.length - 1 && (
                  <div style={{ position: "absolute", right: "-10px", top: "50%", transform: "translateY(-50%)", zIndex: 2, color: "#d2d2d7" }} className="hidden md:flex">
                    <ChevronRight size={18} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RFID SECTION ──────────────────────────────────── */}
      <section id="rfid" style={{ background: "white", padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }} className="two-col-grid">
          {/* Visual */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div style={{ background: "#000", borderRadius: "20px", padding: "2.5rem", position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,113,227,0.6), transparent)" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(ellipse, rgba(0,113,227,0.12) 0%, transparent 70%)" }} />

              <Radio size={32} style={{ color: "#0071e3", marginBottom: "1.5rem" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "white", letterSpacing: "-0.022em", marginBottom: "0.5rem" }}>RC522 RFID Reader</h3>
              <p style={{ fontSize: "0.9375rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, letterSpacing: "-0.01em", marginBottom: "1.75rem" }}>
                3.3V SPI interface · 13.56 MHz · ISO/IEC 14443 · MIFARE Classic & Ultralight
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { label: "Frequency", value: "13.56 MHz" },
                  { label: "Protocol", value: "SPI / I²C" },
                  { label: "Read range", value: "≤ 10 cm" },
                  { label: "Scan time", value: "< 50 ms" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "0.75rem 0.875rem" }}>
                    <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>{label}</p>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.span variants={fadeUp} style={{ display: "inline-block", fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", letterSpacing: "-0.005em", marginBottom: "0.875rem" }}>
              RFID Technology
            </motion.span>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.625rem)", fontWeight: 700, letterSpacing: "-0.035em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Hardware you can wire up in 30 minutes.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: "1rem", color: "#6e6e73", lineHeight: 1.7, letterSpacing: "-0.01em", marginBottom: "2.25rem" }}>
              The reader talks SPI to a NodeMCU ESP8266. The firmware reads the UID, formats it as spaced hexadecimal, and posts JSON to the attendance API. No proprietary hardware required.
            </motion.p>

            <motion.ul variants={stagger} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              {[
                { Icon: Fingerprint, text: "One card, one student. Duplicate assignment is rejected at registration." },
                { Icon: Wifi, text: "ESP8266 Wi-Fi only. Firmware source is included in nodemcu_rfid.ino." },
                { Icon: Timer, text: "Cooldown, late cutoff and half-day hours are fully configurable in admin settings." },
                { Icon: Shield, text: "Device API key authentication prevents unauthorized scanners from posting data." },
              ].map(({ Icon, text }) => (
                <motion.li key={text} variants={fadeUp} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(0,113,227,0.07)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: "1px" }}>
                    <Icon size={15} style={{ color: "#0071e3" }} />
                  </div>
                  <span style={{ fontSize: "0.9375rem", color: "#3d3d3f", lineHeight: 1.6, letterSpacing: "-0.01em" }}>{text}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* ── ANALYTICS ─────────────────────────────────────── */}
      <section style={{ background: "#f5f5f7", padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }} className="two-col-grid">
          {/* Text */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.span variants={fadeUp} style={{ display: "inline-block", fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", letterSpacing: "-0.005em", marginBottom: "0.875rem" }}>
              Analytics
            </motion.span>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.625rem)", fontWeight: 700, letterSpacing: "-0.035em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Data a department can act on.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: "1rem", color: "#6e6e73", lineHeight: 1.7, letterSpacing: "-0.01em", marginBottom: "2rem" }}>
              Daily volume, weekly percentage trends, department comparisons, and subject-level breakdowns. All charts read from live attendance data — not hardcoded sample arrays.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/login?role=admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#0071e3", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em", transition: "gap 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.gap = "0.625rem")}
                onMouseLeave={e => (e.currentTarget.style.gap = "0.375rem")}
              >
                View live dashboard <ArrowRight size={15} />
              </Link>
            </motion.div>
          </motion.div>

          {/* Chart */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <AttendanceChart />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────── */}
      <section id="features" style={{ background: "white", padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            style={{ marginBottom: "4rem" }}
          >
            <motion.span variants={fadeUp} style={{ display: "inline-block", fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", letterSpacing: "-0.005em", marginBottom: "0.875rem" }}>
              Features
            </motion.span>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.035em", color: "#1d1d1f", lineHeight: 1.1, maxWidth: "540px" }}>
              Everything you need, already built.
            </motion.h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "rgba(0,0,0,0.07)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 4) * 0.06 }}
                style={{ background: "white", padding: "1.875rem", transition: "background 0.2s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "#fbfbfd")}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "white")}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,113,227,0.07)", display: "grid", placeItems: "center", marginBottom: "1.125rem" }}>
                  <Icon size={17} style={{ color: "#0071e3" }} />
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.015em", marginBottom: "0.375rem" }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#6e6e73", lineHeight: 1.6, letterSpacing: "-0.007em" }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{ background: "#000", padding: "8rem 1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "400px", background: "radial-gradient(ellipse, rgba(0,113,227,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ maxWidth: "600px", margin: "0 auto", position: "relative" }}
        >
          <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "white", lineHeight: 1.08, marginBottom: "1.25rem" }}>
            Ready to automate attendance?
          </motion.h2>
          <motion.p variants={fadeUp} style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, letterSpacing: "-0.012em", marginBottom: "2.5rem" }}>
            Set up in minutes. Admin console, student portal, IoT device management, and report exports — all included.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login?role=admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#0071e3", color: "white", textDecoration: "none", padding: "0.9375rem 2rem", borderRadius: "980px", fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.012em", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#0077ed"; e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0071e3"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              Get started <ArrowRight size={16} />
            </Link>
            <Link href="/docs" style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none", padding: "0.9375rem 1.75rem", borderRadius: "980px", fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.012em", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            >
              Read docs
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{ background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#0071e3", display: "grid", placeItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2.5" /><path d="M7 12h5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" /><circle cx="16.5" cy="12" r="1.5" fill="white" /></svg>
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "-0.01em" }}>SmartAttend</span>
          </Link>

          <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.25)", letterSpacing: "-0.003em" }}>
            © {new Date().getFullYear()} Crestview University. All rights reserved.
          </p>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[["Docs", "/docs"], ["Admin", "/login?role=admin"], ["Student", "/login?role=student"], ["Register", "/register"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.18s", letterSpacing: "-0.003em" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid-cols { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hero-mockup { display: none !important; }
          .two-col-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hidden.md\\:flex { display: none !important; }
        }
      `}</style>
    </div>
  );
}
