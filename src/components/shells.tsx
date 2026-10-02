"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  Cpu,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  ScanLine,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { kolkataParts } from "@/lib/format";

type ShellUser = { name: string; email: string; role: string };

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/rfid", label: "RFID Management", icon: ScanLine },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/attendance/live", label: "Start Attendance 🟢", icon: Radio },
  { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/devices", label: "IoT Devices", icon: Cpu },
  { href: "/admin/iot", label: "IoT Control Center", icon: Sparkles },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const studentLinks = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/student/profile", label: "Profile", icon: UserRound },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
];

const adminSections = [
  { label: "Overview", links: adminLinks.slice(0, 2) },
  { label: "Management", links: adminLinks.slice(2, 8) },
  { label: "IoT & System", links: adminLinks.slice(8, 11) },
  { label: "Account", links: adminLinks.slice(11) },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
          <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16.5" cy="12" r="1.5" fill="white" />
        </svg>
      </div>
      <div>
        <span className={`block text-sm font-bold tracking-tight leading-none ${light ? "text-white" : "text-slate-900"}`}>
          SmartAttend
        </span>
        <span className={`block text-[10px] font-bold uppercase tracking-wider leading-tight ${light ? "text-indigo-300/70" : "text-slate-500"}`}>
          Crestview University
        </span>
      </div>
    </Link>
  );
}

function useClock() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const parts = kolkataParts();
      setLabel(`${parts.date} · ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} IST`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function useUnread() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stop = false;
    const load = () =>
      api<{ unread: number }>("/api/notifications")
        .then((res) => { if (!stop) setCount(res.unread); })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 20000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  return count;
}

export function AdminShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  return (
    <AppShell user={user} links={adminLinks} home="/admin/dashboard" bottom={[adminLinks[0], adminLinks[1], adminLinks[8], adminLinks[9]]} sections={adminSections}>
      {children}
    </AppShell>
  );
}

export function StudentShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const studentSections = [{ label: "Navigation", links: studentLinks }];
  return (
    <AppShell user={user} links={studentLinks} home="/student/dashboard" bottom={studentLinks} sections={studentSections}>
      {children}
    </AppShell>
  );
}

function AppShell({
  user,
  children,
  links,
  home,
  bottom,
  sections,
}: {
  user: ShellUser;
  children: React.ReactNode;
  links: typeof adminLinks;
  home: string;
  bottom: typeof adminLinks;
  sections: { label: string; links: typeof adminLinks }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const clock = useClock();
  const unread = useUnread();
  const noticeHref = user.role === "ADMIN" ? "/admin/notifications" : "/student/notifications";
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <div className="flex h-full flex-col bg-slate-950 text-white border-r border-white/5">
      {/* Logo area */}
      <div className="p-6 border-b border-white/5">
        <Logo light />
      </div>

      {/* User card */}
      <div className="p-4 border-b border-white/5">
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 grid place-items-center text-[11px] font-extrabold text-white shrink-0 shadow-md shadow-indigo-500/20">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-indigo-300/70 font-bold uppercase tracking-wider truncate">
              {user.role === "ADMIN" ? "Administrator" : "Student"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {sections.map(({ label, links: sectionLinks }) => (
          <div key={label} className="mb-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 px-3 mb-2">
              {label}
            </p>
            {sectionLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mb-1 relative group ${
                    active
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}
                  <Icon size={18} className={`${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} shrink-0 transition-colors`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/20"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 z-40 w-64 overflow-y-auto">
        {nav}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm border-none cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative h-full w-64"
            >
              <button
                className="absolute right-4 top-4 text-slate-400 hover:text-white bg-none border-none cursor-pointer z-10"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
              {nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-200 transition-colors"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-none mb-1">
                {user.role === "ADMIN" ? "Administrator Portal" : "Student Portal"}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {clock || "Asia/Kolkata"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              href={noticeHref}
              className="relative w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center px-1 shadow-sm ring-2 ring-white">
                  {unread}
                </span>
              )}
            </Link>

            {/* User badge */}
            <Link
              href={home}
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 grid place-items-center text-[10px] font-extrabold text-white shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-slate-900">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 lg:hidden grid grid-cols-4 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 shadow-lg"
      >
        {bottom.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                active ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-bold truncate max-w-full px-1">
                {link.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
: GraduationCap },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/devices", label: "IoT Devices", icon: Cpu },
  { href: "/admin/iot", label: "IoT Control Center", icon: Sparkles },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const studentLinks = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/student/profile", label: "Profile", icon: UserRound },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
];

const adminSections = [
  { label: "Overview", links: adminLinks.slice(0, 2) },
  { label: "Management", links: adminLinks.slice(2, 8) },
  { label: "IoT & System", links: adminLinks.slice(8, 11) },
  { label: "Account", links: adminLinks.slice(11) },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "0.625rem",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
          flexShrink: 0,
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1)")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
          <path d="M7 12h5" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16.5" cy="12" r="1.5" fill="white" />
        </svg>
      </div>
      <div>
        <span
          style={{
            display: "block",
            fontSize: "0.925rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: light ? "white" : "#0f172a",
          }}
        >
          SmartAttend
        </span>
        <span
          style={{
            display: "block",
            fontSize: "0.6rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: light ? "rgba(165,180,252,0.65)" : "#94a3b8",
          }}
        >
          Crestview University
        </span>
      </div>
    </Link>
  );
}

function useClock() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const parts = kolkataParts();
      setLabel(`${parts.date} · ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} IST`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function useUnread() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stop = false;
    const load = () =>
      api<{ unread: number }>("/api/notifications")
        .then((res) => { if (!stop) setCount(res.unread); })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 20000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  return count;
}

export function AdminShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  return (
    <AppShell user={user} links={adminLinks} home="/admin/dashboard" bottom={[adminLinks[0], adminLinks[1], adminLinks[8], adminLinks[9]]} sections={adminSections}>
      {children}
    </AppShell>
  );
}

export function StudentShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const studentSections = [{ label: "Navigation", links: studentLinks }];
  return (
    <AppShell user={user} links={studentLinks} home="/student/dashboard" bottom={studentLinks} sections={studentSections}>
      {children}
    </AppShell>
  );
}

function AppShell({
  user,
  children,
  links,
  home,
  bottom,
  sections,
}: {
  user: ShellUser;
  children: React.ReactNode;
  links: typeof adminLinks;
  home: string;
  bottom: typeof adminLinks;
  sections: { label: string; links: typeof adminLinks }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const clock = useClock();
  const unread = useUnread();
  const noticeHref = user.role === "ADMIN" ? "/admin/notifications" : "/student/notifications";
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        background: "linear-gradient(180deg, #070e21 0%, #060d1f 100%)",
        color: "white",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: "1.25rem 1.25rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Logo light />
      </div>

      {/* User card */}
      <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          style={{
            borderRadius: "0.875rem",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.15)",
            padding: "0.75rem 0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.625rem",
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "grid",
              placeItems: "center",
              fontSize: "0.7rem",
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
            <p style={{ fontSize: "0.65rem", color: "rgba(165,180,252,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {user.role === "ADMIN" ? "Administrator" : "Student"}
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.62rem", color: "#34d399", fontWeight: 700 }}>
            <span style={{ width: "0.45rem", height: "0.45rem", borderRadius: "50%", background: "#34d399", flexShrink: 0, animation: "pulse-ring 2s infinite" }} />
            Live
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0.75rem" }}>
        {sections.map(({ label, links: sectionLinks }) => (
          <div key={label} style={{ marginBottom: "1rem" }}>
            <p
              style={{
                fontSize: "0.6rem",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(148,163,184,0.4)",
                padding: "0 0.5rem",
                marginBottom: "0.35rem",
              }}
            >
              {label}
            </p>
            {sectionLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    borderRadius: "0.75rem",
                    padding: "0.575rem 0.875rem",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    marginBottom: "0.15rem",
                    transition: "all 0.15s ease",
                    position: "relative",
                    background: active
                      ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))"
                      : "transparent",
                    border: active ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                    color: active ? "#c7d2fe" : "rgba(148,163,184,0.8)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color = "rgba(148,163,184,0.8)";
                    }
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "0.3rem",
                        bottom: "0.3rem",
                        width: "3px",
                        borderRadius: "0 4px 4px 0",
                        background: "linear-gradient(180deg, #a5b4fc, #6366f1)",
                        boxShadow: "0 0 10px rgba(99,102,241,0.6)",
                      }}
                    />
                  )}
                  <Icon size={16} style={{ color: active ? "#a5b4fc" : "rgba(148,163,184,0.5)", flexShrink: 0 }} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <button
          onClick={logout}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "0.75rem",
            borderRadius: "0.75rem",
            padding: "0.625rem 0.875rem",
            fontSize: "0.825rem",
            fontWeight: 600,
            color: "rgba(148,163,184,0.7)",
            background: "none",
            border: "1px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
            (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.7)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5fb" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block"
        style={{ position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 40, width: "15rem", overflowY: "auto" }}
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              style={{ position: "absolute", inset: 0, background: "rgba(6,13,31,0.65)", backdropFilter: "blur(4px)", border: "none", cursor: "pointer" }}
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ position: "relative", height: "100%", width: "15.5rem" }}
            >
              <button
                style={{ position: "absolute", right: "0.875rem", top: "1rem", color: "rgba(148,163,184,0.7)", background: "none", border: "none", cursor: "pointer", zIndex: 1 }}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
              {nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top header */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.75rem 1.5rem",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(226,232,240,0.8)",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.625rem",
                background: "#f1f5f9",
                border: "1.5px solid #e2e8f0",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#475569",
                transition: "all 0.15s",
              }}
              aria-label="Open menu"
            >
              <Menu size={17} />
            </button>
            <div>
              <p
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1,
                  marginBottom: "0.2rem",
                }}
              >
                {user.role === "ADMIN" ? "Administrator Portal" : "Student Portal"}
              </p>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>
                {clock || "Asia/Kolkata"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Notifications */}
            <Link
              href={noticeHref}
              style={{
                position: "relative",
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.625rem",
                background: "#f1f5f9",
                border: "1.5px solid #e2e8f0",
                display: "grid",
                placeItems: "center",
                textDecoration: "none",
                color: "#475569",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#eef2ff";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#c7d2fe";
                (e.currentTarget as HTMLAnchorElement).style.color = "#6366f1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#f1f5f9";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e2e8f0";
                (e.currentTarget as HTMLAnchorElement).style.color = "#475569";
              }}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    right: "-0.25rem",
                    top: "-0.25rem",
                    minWidth: "1.1rem",
                    height: "1.1rem",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    color: "white",
                    padding: "0 0.2rem",
                    boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
                  }}
                >
                  {unread}
                </span>
              )}
            </Link>

            {/* User badge */}
            <Link
              href={home}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                borderRadius: "0.875rem",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                padding: "0.4rem 0.875rem 0.4rem 0.4rem",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#eef2ff";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#c7d2fe";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#f8fafc";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e2e8f0";
              }}
              className="hidden sm:flex"
            >
              <div
                style={{
                  width: "1.875rem",
                  height: "1.875rem",
                  borderRadius: "0.5rem",
                  background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  color: "white",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
                }}
              >
                {initials}
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", lineHeight: "1.2" }}>{user.name}</span>
                <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", fontWeight: 500 }}>{user.email}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: "1.5rem 1.5rem 6rem", maxWidth: "80rem", margin: "0 auto" }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${bottom.length}, 1fr)`,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid #e2e8f0",
          padding: "0.5rem 0.5rem",
          boxShadow: "0 -4px 20px rgba(15,23,42,0.06)",
        }}
      >
        {bottom.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "grid",
                placeItems: "center",
                gap: "0.2rem",
                borderRadius: "0.875rem",
                padding: "0.5rem 0.25rem",
                fontSize: "0.62rem",
                fontWeight: 700,
                textDecoration: "none",
                color: active ? "#6366f1" : "#94a3b8",
                background: active ? "#eef2ff" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <Icon size={19} />
              {link.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }
      `}</style>
    </div>
  );
}
