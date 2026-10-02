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
  { title: "Web Dashboard", desc: "Admin and student views update from the database.", icon: "📊" },
];

const features = [
  ["Role-based access", "Administrators and students receive different consoles. Attendance cannot be edited by students."],
  ["Entry and exit tracking", "The first valid scan of the day is entry. The next valid scan, after cooldown, is exit."],
  ["Duplicate protection", "Repeated taps inside the cooldown window are rejected and logged."],
  ["Unknown card alerts", "Unregistered UIDs never create attendance. Administrators are notified instantly."],
  ["Manual correction log", "Every admin edit is stored in an attendance modification log for full auditability."],
  ["Device heartbeat", "NodeMCU units announce themselves. Stale readers are marked offline automatically."],
  ["Export reports", "Daily, monthly, student, department and subject reports export to CSV and PDF."],
  ["Policy alerts", "Students under the attendance threshold receive automatic notifications."],
];

const stats = [
  { label: "Scan cooldown", value: "45s" },
  { label: "Late cutoff IST", value: "09:15" },
  { label: "Policy threshold", value: "75%" },
];

export function LandingPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-center py-2 px-4 text-[10px] tracking-widest uppercase font-bold text-white">
        University IoT Platform · Academic Year 2025-26 · RFID Attendance System
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16.5" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-bold text-white tracking-tight leading-none">SmartAttend</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300/70 leading-tight">Crestview University</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            {["#how", "#rfid", "#architecture", "#features"].map((href, i) => (
              <a
                key={href}
                href={href}
                className="hover:text-white transition-colors duration-200"
              >
                {["How it works", "RFID", "Architecture", "Features"][i]}
              </a>
            ))}
            <Link href="/docs" className="hover:text-white transition-colors duration-200">Docs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login?role=student" className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
              Student Login
            </Link>
            <Link href="/login?role=admin" className="px-4 py-2 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              Admin Login
            </Link>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-white/10 p-6 flex flex-col gap-4 text-sm text-slate-300">
            {[["#how", "How it works"], ["#rfid", "RFID"], ["#architecture", "Architecture"], ["#features", "Features"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-white transition-colors" onClick={() => setOpen(false)}>{label}</a>
            ))}
            <hr className="border-white/10" />
            <Link href="/login?role=admin" className="text-white font-bold">Admin Login</Link>
            <Link href="/login?role=student" className="text-white">Student Login</Link>
            <Link href="/register" className="text-indigo-400 font-bold">Register</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-950 text-white">
        <img
          src="/images/campus.jpg"
          alt="Campus"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(79,70,229,0.15),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase text-indigo-300 mb-6">
              <Zap size={12} className="text-amber-400" />
              University IoT Platform
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">IoT-Based Smart</span>
              <br />
              <span>Attendance</span>
              <br />
              <span>Management</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-xl mb-10 leading-relaxed">
              Automated RFID attendance powered by IoT, real-time cloud connectivity, and actionable analytics for modern educational institutions.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link href="/login?role=admin" className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                Admin Login <ArrowRight size={18} />
              </Link>
              <Link href="/login?role=student" className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all border border-slate-700">
                Student Login
              </Link>
              <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20">
                Register <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 border-t border-white/10 pt-8 max-w-md">
              {stats.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-3xl font-bold text-white leading-none">{value}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-2 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500" />
            <div className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-6">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Reader
                </span>
                <span className="font-mono">NODEMCU-01</span>
              </div>

              <p className="font-mono text-4xl tracking-[0.2em] text-center text-white mb-8 py-4 bg-slate-950 rounded-2xl border border-white/5 shadow-inner">
                A3 7F 21 9C
              </p>

              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Latest resolved scan</p>
                <p className="text-lg font-semibold text-white">Akash Singh · CU12345</p>
                <p className="text-sm text-emerald-400 font-medium mt-1">✓ Present · Entry · Main Gate</p>
              </div>

              <div className="flex gap-3 justify-center">
                {["RC522", "ESP8266", "Wi-Fi"].map((tag) => (
                  <span key={tag} className="text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3 block">How it works</span>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            A card tap becomes a <span className="text-indigo-600">verified record.</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            From physical reader to database in milliseconds — the entire pipeline is automated and auditable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.slice(0, 4).map(({ title, desc, icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  {icon}
                </div>
                <span className="font-mono text-xs font-bold text-indigo-400">0{index + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* RFID Section */}
      <section id="rfid" className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img
              src="/images/access.jpg"
              alt="Access"
              className="w-full rounded-3xl object-cover aspect-[4/3] shadow-2xl"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 grid place-items-center text-white">
                <Radio size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">RC522 · 13.56 MHz</p>
                <p className="text-xs text-slate-400">3.3V SPI · UID scan in &lt;50ms</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 block">RFID Technology</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">
              RC522 on 3.3V, nothing else in the power path.
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              The reader talks SPI to a NodeMCU ESP8266. The sketch reads the UID, formats it as spaced hexadecimal, and posts JSON to the attendance API.
            </p>
            <ul className="space-y-4">
              {[
                { Icon: Fingerprint, text: "One card, one student. Duplicate assignment is rejected at registration." },
                { Icon: Wifi, text: "ESP8266 Wi-Fi only. The firmware example is in nodemcu_rfid.ino." },
                { Icon: Timer, text: "Cooldown, late cutoff and half-day hours are admin settings." },
              ].map(({ Icon, text }, i) => (
                <li key={i} className="flex items-start gap-4 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-1">
                    <Icon size={16} className="text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Dashboard previews */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 block">Dashboards</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Purpose-built for every role.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                img: "/images/lecture.jpg",
                tag: "Student Dashboard",
                title: "Attendance the student can actually read.",
                desc: "Percentage, present, absent and late days, subject bars, a month calendar, and a history that can be exported.",
              },
              {
                img: "/images/lab.jpg",
                tag: "Admin Dashboard",
                title: "A registrar console, not a spreadsheet.",
                desc: "Today's present, absent and late counts beside the live RFID feed, device health, and department analytics.",
              },
            ].map(({ img, tag, title, desc }) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-64 overflow-hidden">
                  <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-indigo-300 border border-white/10">
                    {tag}
                  </span>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 block">Analytics</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">
              Trends a department can defend in a review.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Daily volume, weekly percentage, department and subject comparisons, and a status mix. Charts read from stored attendance, not sample arrays.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Present", value: "78%", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Late", value: "11%", color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Absent", value: "8%", color: "text-rose-600", bg: "bg-rose-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} p-6 rounded-2xl text-center`}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">{label}</p>
                  <p className={`text-3xl font-extrabold ${color} leading-none`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
                <div style={{ flex: 78 }} className="bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div style={{ flex: 11 }} className="bg-gradient-to-r from-amber-400 to-amber-600" />
                <div style={{ flex: 8 }} className="bg-gradient-to-r from-rose-400 to-rose-600" />
                <div style={{ flex: 3 }} className="bg-slate-200" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <BarChart3 size={14} />
                Illustrative mix from a typical teaching week.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="bg-slate-950 py-24 px-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="max-w-7xl mx-auto relative">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3 block">IoT Architecture</span>
          <h2 className="text-4xl font-extrabold tracking-tight mb-12">
            The physical reader and the simulator share one contract.
          </h2>

          <div className="flex gap-6 overflow-x-auto pb-8 mb-16 snap-x">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center gap-6 shrink-0 snap-start">
                <div className="w-48 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <p className="font-mono text-[10px] font-bold text-indigo-400 mb-1">0{index + 1}</p>
                  <p className="font-bold text-sm">{step.title}</p>
                </div>
                {index < steps.length - 1 && <ArrowRight size={20} className="text-white/20 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { Icon: Cpu, title: "NodeMCU adapter", desc: "POST /api/rfid/scan and POST /api/devices/heartbeat. No separate simulator logic." },
              { Icon: ShieldCheck, title: "Protected consoles", desc: "JWT in an HTTP-only cookie, bcrypt passwords, role checks on every mutating route." },
              { Icon: Bell, title: "Operator alerts", desc: "Unknown cards, offline readers, and low attendance are written as notifications." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold mb-3">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 block">Project features</span>
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-12">
          What the demonstration actually does.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map(([title, copy]) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all flex gap-4"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-1">
                <CheckCircle2 size={14} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{copy}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30">
            Register a student <ArrowRight size={18} />
          </Link>
          <Link href="/docs" className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">
            API, wiring &amp; demo script
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-16 px-6 text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16.5" cy="12" r="1.5" fill="white" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">SmartAttend</span>
            </div>
            <p className="text-sm leading-relaxed opacity-70">
              IoT-Based Smart Attendance Management System for Crestview University, School of Computing. MCA final-year demonstration build.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3 opacity-70">
              <Radio size={16} /> RC522 · 13.56 MHz · ESP8266 · 3.3V SPI
            </div>
            <p className="opacity-50">Photos generated with AI for demonstration purposes.</p>
            <Link href="/docs" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              Integration notes & API docs →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
inherit" }}>Student Login</Link>
            <Link href="/register" style={{ textDecoration: "none", color: "#a5b4fc" }}>Register</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        className="hero-grid"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(160deg, #060d1f 0%, #0d1a30 55%, #060d1f 100%)",
          color: "white",
          minHeight: "90vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src="/images/campus.jpg"
          alt="Modern university building at twilight"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.2,
          }}
        />
        {/* Gradient overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,13,31,0.97) 0%, rgba(6,13,31,0.82) 55%, rgba(6,13,31,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)" }} />

        <div
          style={{
            position: "relative",
            maxWidth: "72rem",
            margin: "0 auto",
            padding: "4rem 1.5rem",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "3rem",
            width: "100%",
          }}
          className="lg:grid-cols-[1.1fr_0.9fr]"
        >
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "999px",
                padding: "0.35rem 1rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#a5b4fc",
                marginBottom: "1.5rem",
              }}
            >
              <Zap size={12} style={{ color: "#fbbf24" }} />
              University IoT Platform
            </div>

            <h1
              className="font-display"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: "1", marginBottom: "1.25rem" }}
            >
              <span className="gradient-text-white">IoT-Based Smart</span>
              <br />
              <span style={{ color: "white" }}>Attendance</span>
              <br />
              <span style={{ color: "white" }}>Management</span>
            </h1>

            <p style={{ fontSize: "1.05rem", lineHeight: "1.75", color: "rgba(255,255,255,0.65)", maxWidth: "30rem", marginBottom: "2rem" }}>
              Automated RFID attendance powered by IoT, real-time cloud connectivity, and actionable analytics.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2.5rem" }}>
              <Link href="/login?role=admin" className="btn btn-light">
                Admin Login <ArrowRight size={15} />
              </Link>
              <Link href="/login?role=student" className="btn btn-ghost">
                Student Login
              </Link>
              <Link href="/register" className="btn btn-tide">
                Register <ArrowRight size={15} />
              </Link>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: "1.5rem",
                maxWidth: "26rem",
              }}
            >
              {stats.map(({ label, value }) => (
                <div key={label}>
                  <p className="font-display" style={{ fontSize: "2rem", color: "white", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: "0.3rem" }}>{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RFID scanner card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="scan-frame self-center"
            style={{ padding: "1.75rem" }}
          >
            <div className="scan-beam" />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="pulse-dot" /> Live Reader
                </span>
                <span className="font-mono">NODEMCU-01</span>
              </div>

              <p className="font-mono" style={{ fontSize: "2rem", letterSpacing: "0.15em", margin: "1.5rem 0 1rem", color: "white" }}>
                A3 7F 21 9C
              </p>

              <div
                style={{
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Latest resolved scan</p>
                <p style={{ fontSize: "1rem", fontWeight: 600, color: "white" }}>Akash Singh · CU12345</p>
                <p style={{ fontSize: "0.8rem", color: "#6ee7b7", marginTop: "0.25rem" }}>✓ Present · Entry · Main Gate</p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["RC522", "ESP8266", "Wi-Fi"].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                      background: "rgba(99,102,241,0.2)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      color: "#a5b4fc",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ maxWidth: "72rem", margin: "0 auto", padding: "5rem 1.5rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#6366f1" }}>How it works</span>
        </div>
        <h2 className="font-display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginBottom: "0.75rem" }}>
          A card tap becomes a{" "}
          <span className="gradient-text">verified record.</span>
        </h2>
        <p style={{ fontSize: "1rem", color: "#64748b", maxWidth: "36rem", marginBottom: "3rem", lineHeight: "1.7" }}>
          From physical reader to database in milliseconds — the entire pipeline is automated and auditable.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1rem",
          }}
        >
          {steps.slice(0, 4).map(({ title, desc, icon }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="panel"
              style={{ padding: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.625rem",
                    background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <span className="font-mono" style={{ fontSize: "0.7rem", color: "#a5b4fc", fontWeight: 700 }}>
                  0{index + 1}
                </span>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.8rem", lineHeight: "1.6", color: "#64748b" }}>{desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* RFID Section */}
      <section
        id="rfid"
        style={{
          background: "white",
          padding: "5rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
          }}
          className="grid-cols-1 lg:grid-cols-2"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ position: "relative" }}
          >
            <img
              src="/images/access.jpg"
              alt="Person holding an access card to a reader"
              style={{
                width: "100%",
                borderRadius: "1.5rem",
                objectFit: "cover",
                aspectRatio: "4/3",
                boxShadow: "0 24px 64px -16px rgba(6,13,31,0.25)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "1.25rem",
                left: "1.25rem",
                right: "1.25rem",
                background: "rgba(6,13,31,0.85)",
                backdropFilter: "blur(12px)",
                borderRadius: "1rem",
                padding: "0.875rem 1rem",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "grid", placeItems: "center" }}>
                <Radio size={14} color="white" />
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>RC522 · 13.56 MHz</p>
                <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>3.3V SPI · UID scan in &lt;50ms</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#6366f1" }}>RFID Technology</span>
            <h2 className="font-display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", margin: "0.75rem 0 1rem" }}>
              RC522 on 3.3V, nothing else in the power path.
            </h2>
            <p style={{ fontSize: "0.925rem", lineHeight: "1.75", color: "#64748b", marginBottom: "1.75rem" }}>
              The reader talks SPI to a NodeMCU ESP8266. The sketch reads the UID, formats it as spaced hexadecimal, and posts JSON to the attendance API. Bluetooth is intentionally not part of this design.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {[
                { Icon: Fingerprint, text: "One card, one student. Duplicate assignment is rejected at registration." },
                { Icon: Wifi, text: "ESP8266 Wi-Fi only. The firmware example is in nodemcu_rfid.ino." },
                { Icon: Timer, text: "Cooldown, late cutoff and half-day hours are admin settings." },
              ].map(({ Icon, text }, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.875rem", color: "#334155" }}>
                  <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem", background: "#eef2ff", display: "grid", placeItems: "center", flexShrink: 0, marginTop: "0.05rem" }}>
                    <Icon size={14} color="#6366f1" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Dashboard previews */}
      <section style={{ background: "#f8fafc", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#6366f1" }}>Dashboards</span>
            <h2 className="font-display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", margin: "0.5rem 0 0.75rem" }}>
              Purpose-built for every role.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                img: "/images/lecture.jpg",
                tag: "Student Dashboard",
                title: "Attendance the student can actually read.",
                desc: "Percentage, present, absent and late days, subject bars, a month calendar, and a history that can be exported. Students cannot rewrite records.",
              },
              {
                img: "/images/lab.jpg",
                tag: "Admin Dashboard",
                title: "A registrar console, not a spreadsheet.",
                desc: "Today's present, absent and late counts beside the live RFID feed, device health, and department analytics. Corrections stay in the modification log.",
              },
            ].map(({ img, tag, title, desc }) => (
              <motion.article
                key={tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="panel"
                style={{ overflow: "hidden" }}
              >
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <img
                    src={img}
                    alt={title}
                    style={{ width: "100%", height: "14rem", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,13,31,0.4) 0%, transparent 50%)" }} />
                  <span
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "#a5b4fc",
                      background: "rgba(6,13,31,0.7)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: "999px",
                      padding: "0.25rem 0.75rem",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {tag}
                  </span>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <h3 className="font-display" style={{ fontSize: "1.35rem", marginBottom: "0.625rem" }}>{title}</h3>
                  <p style={{ fontSize: "0.85rem", lineHeight: "1.65", color: "#64748b" }}>{desc}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section style={{ maxWidth: "72rem", margin: "0 auto", padding: "5rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "3rem", alignItems: "center" }} className="grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#6366f1" }}>Analytics</span>
            <h2 className="font-display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", margin: "0.75rem 0 1rem" }}>
              Trends a department can defend in a review.
            </h2>
            <p style={{ fontSize: "0.875rem", lineHeight: "1.75", color: "#64748b" }}>
              Daily volume, weekly percentage, department and subject comparisons, and a status mix. Charts read from stored attendance, not sample arrays in the browser.
            </p>
          </div>

          <div className="panel-glow" style={{ padding: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem", marginBottom: "0.875rem" }}>
              {[
                { label: "Present", value: "78%", color: "#10b981", bg: "#d1fae5" },
                { label: "Late", value: "11%", color: "#f59e0b", bg: "#fef3c7" },
                { label: "Absent", value: "8%", color: "#ef4444", bg: "#fee2e2" },
              ].map(({ label, value, color, bg }) => (
                <div
                  key={label}
                  style={{
                    borderRadius: "1rem",
                    background: bg,
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "0.4rem", fontWeight: 700 }}>{label}</p>
                  <p className="font-display" style={{ fontSize: "2.25rem", color, lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Visual bar */}
            <div style={{ borderRadius: "0.875rem", background: "#f8fafc", padding: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "0.25rem", height: "0.75rem", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" }}>
                <div style={{ flex: 78, background: "linear-gradient(90deg,#34d399,#10b981)" }} />
                <div style={{ flex: 11, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
                <div style={{ flex: 8, background: "linear-gradient(90deg,#f87171,#ef4444)" }} />
                <div style={{ flex: 3, background: "#e2e8f0" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748b" }}>
                <BarChart3 size={14} />
                Illustrative mix from a typical teaching week. Open the admin console for live figures.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section
        id="architecture"
        style={{
          background: "linear-gradient(160deg, #060d1f 0%, #0d1a30 55%, #060d1f 100%)",
          padding: "5rem 1.5rem",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "72rem", margin: "0 auto", position: "relative" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#a5b4fc" }}>IoT Architecture</span>
          <h2 className="font-display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", margin: "0.75rem 0 2.5rem" }}>
            The physical reader and the simulator share one contract.
          </h2>

          {/* Pipeline */}
          <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "1rem", marginBottom: "3rem" }}>
            {steps.map((step, index) => (
              <div key={step.title} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <div
                  style={{
                    minWidth: "10rem",
                    borderRadius: "1.25rem",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "1.25rem",
                  }}
                >
                  <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{step.icon}</div>
                  <p className="font-mono" style={{ fontSize: "0.65rem", color: "#a5b4fc", fontWeight: 700, marginBottom: "0.4rem" }}>0{index + 1}</p>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight size={16} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
            {[
              { Icon: Cpu, title: "NodeMCU adapter", desc: "POST /api/rfid/scan and POST /api/devices/heartbeat. No separate simulator logic." },
              { Icon: ShieldCheck, title: "Protected consoles", desc: "JWT in an HTTP-only cookie, bcrypt passwords, role checks on every mutating route." },
              { Icon: Bell, title: "Operator alerts", desc: "Unknown cards, offline readers, and low attendance are written as notifications." },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  borderRadius: "1.25rem",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "1.5rem",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.1)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", background: "rgba(99,102,241,0.2)", display: "grid", placeItems: "center", marginBottom: "1rem" }}>
                  <Icon size={18} color="#a5b4fc" />
                </div>
                <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{title}</p>
                <p style={{ fontSize: "0.825rem", color: "rgba(255,255,255,0.55)", lineHeight: "1.65" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: "72rem", margin: "0 auto", padding: "5rem 1.5rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#6366f1" }}>Project features</span>
        <h2 className="font-display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", margin: "0.5rem 0 2.5rem" }}>
          What the demonstration actually does.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {features.map(([title, copy]) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="panel"
              style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "0.875rem", alignItems: "flex-start" }}
            >
              <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", background: "#eef2ff", display: "grid", placeItems: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                <CheckCircle2 size={13} color="#6366f1" />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.375rem" }}>{title}</h3>
                <p style={{ fontSize: "0.8rem", lineHeight: "1.6", color: "#64748b" }}>{copy}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href="/register" className="btn btn-primary">
            Register a student <ArrowRight size={15} />
          </Link>
          <Link href="/docs" className="btn btn-ghost-dark">
            API, wiring &amp; demo script
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "linear-gradient(160deg, #060d1f 0%, #0d1a30 100%)",
          padding: "3rem 1.5rem",
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.85rem",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
          }}
          className="md:flex-row md:justify-between"
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
                  <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16.5" cy="12" r="1.5" fill="white" />
                </svg>
              </div>
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>SmartAttend</span>
            </div>
            <p style={{ maxWidth: "26rem", lineHeight: "1.7", color: "rgba(255,255,255,0.45)" }}>
              IoT-Based Smart Attendance Management System for Crestview University, School of Computing. MCA final-year demonstration build.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Radio size={13} /> RC522 · 13.56 MHz · ESP8266 · 3.3V SPI
            </p>
            <p>Photos generated with AI for demonstration purposes.</p>
            <Link href="/docs" style={{ color: "#a5b4fc", textDecoration: "none" }}>
              Integration notes & API docs →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
