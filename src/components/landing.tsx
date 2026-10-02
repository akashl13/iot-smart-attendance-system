"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Cpu,
  Fingerprint,
  Menu,
  Radio,
  ShieldCheck,
  Timer,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const steps = [
  { title: "RFID Card", desc: "Student taps a registered card.", icon: "💳" },
  { title: "RC522 Reader", desc: "13.56 MHz reader captures the UID.", icon: "📡" },
  { title: "NodeMCU ESP8266", desc: "Firmware formats the UID and device ID.", icon: "🔌" },
  { title: "Wi-Fi Network", desc: "The reader posts over the campus network.", icon: "📶" },
  { title: "REST API", desc: "The /api/rfid/scan endpoint processes the scan.", icon: "⚙️" },
  { title: "PostgreSQL", desc: "Entry, exit, cooldown and status are persisted.", icon: "🗄️" },
  { title: "Web Dashboard", desc: "Admin and student views update live.", icon: "📊" },
];

const features = [
  ["Role-based access", "Administrators and students receive different consoles."],
  ["Entry and exit tracking", "First valid scan is entry. Next valid scan after cooldown is exit."],
  ["Duplicate protection", "Repeated taps inside the cooldown window are rejected."],
  ["Unknown card alerts", "Unregistered UIDs never create attendance."],
  ["Manual correction log", "Every admin edit is stored for full auditability."],
  ["Device heartbeat", "Stale readers are marked offline automatically."],
  ["Export reports", "CSV and PDF exports for daily, monthly, and per-student data."],
  ["Policy alerts", "Students under the threshold receive automatic notifications."],
];

const stats = [
  { label: "Scan cooldown", value: "45s" },
  { label: "Late cutoff IST", value: "09:15" },
  { label: "Policy threshold", value: "75%" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function LandingPage() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", color: "#1d1d1f", overflowX: "hidden" }}>

      {/* ── Announcement bar ── */}
      <div
        style={{
          background: "#1d1d1f",
          color: "rgba(255,255,255,0.75)",
          textAlign: "center",
          padding: "0.5rem 1rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "-0.003em",
        }}
      >
        University IoT Platform · Academic Year 2025‑26 ·{" "}
        <a href="#how" style={{ color: "#4db3ff", fontWeight: 600 }}>
          See how it works →
        </a>
      </div>

      {/* ── Navigation bar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245, 245, 247, 0.88)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            padding: "0 1.5rem",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "#0071e3",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
                <path d="M7 12h5" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16.5" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em" }}>
              SmartAttend
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav
            className="hidden md:flex"
            style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}
          >
            {[
              ["#how", "How it works"],
              ["#rfid", "RFID"],
              ["#features", "Features"],
              ["/docs", "Docs"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  color: "#6e6e73",
                  textDecoration: "none",
                  transition: "color 0.2s",
                  letterSpacing: "-0.005em",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#1d1d1f")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#6e6e73")}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              href="/login?role=student"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#0071e3",
                textDecoration: "none",
                padding: "0.375rem 0.75rem",
                borderRadius: "980px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,113,227,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
            >
              Student
            </Link>
            <Link
              href="/login?role=admin"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#ffffff",
                background: "#0071e3",
                textDecoration: "none",
                padding: "0.4375rem 1rem",
                borderRadius: "980px",
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0077ed"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0071e3"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Admin Login
            </Link>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
            style={{ background: "none", border: "none", color: "#1d1d1f", cursor: "pointer", padding: "0.25rem" }}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,0.08)",
              padding: "1rem 1.5rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
              background: "rgba(245,245,247,0.97)",
            }}
          >
            {[["#how", "How it works"], ["#rfid", "RFID"], ["#features", "Features"], ["/docs", "Docs"]].map(
              ([href, label]) => (
                <a
                  key={href}
                  href={href}
                  style={{ fontSize: "0.9375rem", color: "#1d1d1f", textDecoration: "none", fontWeight: 400 }}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              )
            )}
            <div style={{ paddingTop: "0.5rem", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: "0.75rem" }}>
              <Link href="/login?role=admin" style={{ flex: 1, textAlign: "center", padding: "0.625rem", background: "#0071e3", color: "white", borderRadius: "980px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
                Admin Login
              </Link>
              <Link href="/login?role=student" style={{ flex: 1, textAlign: "center", padding: "0.625rem", background: "rgba(0,0,0,0.06)", color: "#1d1d1f", borderRadius: "980px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Student
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "92vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1d1d1f 0%, #000000 100%)",
          color: "white",
          padding: "5rem 1.5rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle glow blobs */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(0,113,227,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ position: "relative", maxWidth: "780px", margin: "0 auto" }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "rgba(0,113,227,0.15)",
              border: "1px solid rgba(0,113,227,0.3)",
              borderRadius: "980px",
              padding: "0.3rem 0.875rem",
              marginBottom: "2rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#4db3ff",
              letterSpacing: "-0.005em",
            }}
          >
            <Zap size={12} style={{ color: "#ffd60a" }} />
            University IoT Platform
          </div>

          <h1
            style={{
              fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              marginBottom: "1.5rem",
            }}
          >
            IoT-Based Smart
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #4db3ff 0%, #0071e3 50%, #5e5ce6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Attendance System
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.55)",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.55,
              letterSpacing: "-0.01em",
            }}
          >
            Automated RFID attendance powered by IoT, real-time cloud connectivity,
            and actionable analytics — purpose-built for educational institutions.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3.5rem" }}>
            <Link
              href="/login?role=admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                background: "#0071e3",
                color: "white",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "980px",
                fontSize: "0.9375rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0077ed"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0071e3"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Admin Login <ArrowRight size={16} />
            </Link>
            <Link
              href="/login?role=student"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "980px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.16)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
            >
              Student Login
            </Link>
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "980px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.07)"; }}
            >
              Register
            </Link>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2.5rem",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              flexWrap: "wrap",
            }}
          >
            {stats.map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em", color: "white", lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.375rem", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── RFID Card mock-up ─────────────────────────────────── */}
      <section style={{ background: "#000", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>
          <motion.div
            {...fadeUp}
            style={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#30d158", animation: "pulse-ring 2.4s infinite" }} />
                Live Reader
              </span>
              <span style={{ fontFamily: "var(--font-mono, monospace)" }}>NODEMCU-01</span>
            </div>

            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "2.25rem",
                letterSpacing: "0.25em",
                textAlign: "center",
                color: "white",
                background: "#000",
                borderRadius: "14px",
                padding: "1rem",
                marginBottom: "1.25rem",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              A3 7F 21 9C
            </p>

            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "1rem 1.125rem",
                marginBottom: "1.25rem",
              }}
            >
              <p style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: "0.375rem" }}>
                Latest resolved scan
              </p>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "white", letterSpacing: "-0.01em" }}>
                Akash Singh · CU12345
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#30d158", marginTop: "0.25rem", fontWeight: 500 }}>
                ✓ Present · Entry · Main Gate
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              {["RC522", "ESP8266", "Wi-Fi"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "980px",
                    background: "rgba(0,113,227,0.12)",
                    border: "1px solid rgba(0,113,227,0.25)",
                    color: "#4db3ff",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how" style={{ background: "#f5f5f7", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", letterSpacing: "-0.005em", display: "block", marginBottom: "0.75rem" }}>
              How it works
            </span>
            <h2
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "0.875rem" }}
            >
              A card tap becomes a verified record.
            </h2>
            <p style={{ fontSize: "1.0625rem", color: "#6e6e73", maxWidth: "480px", margin: "0 auto", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
              From physical reader to database in milliseconds — fully automated and auditable.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {steps.slice(0, 4).map(({ title, desc, icon }, i) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                style={{
                  background: "white",
                  borderRadius: "18px",
                  border: "1px solid rgba(0,0,0,0.06)",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.1)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "rgba(0,113,227,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0071e3", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em" }}>
                    0{i + 1}
                  </span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.015em", marginBottom: "0.375rem" }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#6e6e73", lineHeight: 1.5, letterSpacing: "-0.005em" }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RFID Technology ───────────────────────────────────── */}
      <section id="rfid" style={{ background: "white", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}
          className="grid-cols-rfid">
          <motion.div {...fadeUp}>
            <div
              style={{
                background: "#1c1c1e",
                borderRadius: "20px",
                padding: "2.5rem",
                color: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,113,227,0.5), transparent)" }} />
              <Radio size={32} style={{ color: "#0071e3", marginBottom: "1.25rem" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                RC522 · 13.56 MHz
              </h3>
              <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                3.3V SPI · UID scan in &lt;50ms · Up to 10cm read range
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
                {["SPI", "3.3V", "MIFARE", "ISO/IEC 14443"].map((tag) => (
                  <span key={tag} style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "980px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", display: "block", marginBottom: "0.875rem", letterSpacing: "-0.005em" }}>
              RFID Technology
            </span>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              RC522 on 3.3V, nothing else in the power path.
            </h2>
            <p style={{ fontSize: "1rem", color: "#6e6e73", lineHeight: 1.6, marginBottom: "2rem", letterSpacing: "-0.01em" }}>
              The reader talks SPI to a NodeMCU ESP8266. The sketch reads the UID, formats it as spaced hexadecimal, and posts JSON to the attendance API.
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { Icon: Fingerprint, text: "One card, one student. Duplicate assignment is rejected at registration." },
                { Icon: Wifi, text: "ESP8266 Wi-Fi only. The firmware example is in nodemcu_rfid.ino." },
                { Icon: Timer, text: "Cooldown, late cutoff and half-day hours are admin settings." },
              ].map(({ Icon, text }, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(0,113,227,0.08)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon size={16} style={{ color: "#0071e3" }} />
                  </div>
                  <span style={{ fontSize: "0.9375rem", color: "#1d1d1f", lineHeight: 1.5, letterSpacing: "-0.01em", paddingTop: "0.375rem" }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Analytics ─────────────────────────────────────────── */}
      <section style={{ background: "#f5f5f7", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}
          className="grid-cols-rfid">
          <motion.div {...fadeUp}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", display: "block", marginBottom: "0.875rem" }}>
              Analytics
            </span>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Trends a department can defend.
            </h2>
            <p style={{ fontSize: "1rem", color: "#6e6e73", lineHeight: 1.6, letterSpacing: "-0.01em" }}>
              Daily volume, weekly percentage, department and subject comparisons, and a status mix. Charts read from stored attendance — not sample arrays.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
            <div style={{ background: "white", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.06)", padding: "1.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {[
                  { label: "Present", value: "78%", bg: "rgba(48,209,88,0.1)", color: "#1a7f37" },
                  { label: "Late", value: "11%", bg: "rgba(255,159,10,0.1)", color: "#b5691b" },
                  { label: "Absent", value: "8%", bg: "rgba(255,59,48,0.08)", color: "#c0392b" },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: "14px", padding: "1rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#86868b", fontWeight: 700, marginBottom: "0.375rem" }}>
                      {label}
                    </p>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: "12px", padding: "1rem" }}>
                <div style={{ display: "flex", height: "8px", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <div style={{ flex: 78, background: "#30d158" }} />
                  <div style={{ flex: 11, background: "#ff9f0a" }} />
                  <div style={{ flex: 8, background: "#ff3b30" }} />
                  <div style={{ flex: 3, background: "rgba(0,0,0,0.1)" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#86868b" }}>
                  <BarChart3 size={13} />
                  Illustrative mix from a typical teaching week.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────── */}
      <section id="features" style={{ background: "white", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0071e3", display: "block", marginBottom: "0.75rem" }}>
              Features
            </span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f", lineHeight: 1.1 }}>
              Everything already included.
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "rgba(0,0,0,0.07)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
            {features.map(([title, desc], i) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: (i % 4) * 0.07 }}
                style={{
                  background: "white",
                  padding: "1.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <CheckCircle2 size={18} style={{ color: "#0071e3", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.01em", marginBottom: "0.25rem" }}>
                      {title}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#6e6e73", lineHeight: 1.5, letterSpacing: "-0.005em" }}>
                      {desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section style={{ background: "#000", padding: "6rem 1.5rem", textAlign: "center" }}>
        <motion.div {...fadeUp} style={{ maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "white", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Ready to automate attendance?
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.5)", marginBottom: "2.5rem", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
            Get started in minutes. Admin console, student portal, and IoT device management included.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/login?role=admin"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                background: "#0071e3", color: "white", textDecoration: "none",
                padding: "0.875rem 1.75rem", borderRadius: "980px",
                fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.01em",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0077ed"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0071e3"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            >
              Get started <ArrowRight size={17} />
            </Link>
            <Link
              href="/docs"
              style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)", textDecoration: "none",
                padding: "0.875rem 1.75rem", borderRadius: "980px",
                fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.01em",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; }}
            >
              Read docs
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#000",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#0071e3", display: "grid", placeItems: "center" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2.5" />
                <path d="M7 12h5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16.5" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.01em" }}>
              SmartAttend
            </span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", letterSpacing: "-0.003em" }}>
            © {new Date().getFullYear()} Crestview University. IoT-Based Attendance System.
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["/docs", "/login?role=admin", "/login?role=student"].map((href, i) => (
              <Link key={href} href={href} style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s", letterSpacing: "-0.003em" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)")}
              >
                {["Docs", "Admin", "Student"][i]}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .grid-cols-rfid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .hidden.md\\:flex { display: none !important; }
        }
      `}</style>
    </div>
  );
}
