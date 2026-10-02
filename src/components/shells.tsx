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
  { href: "/admin/attendance/live", label: "Live Attendance", icon: Radio },
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

function useClock() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const parts = kolkataParts();
      setLabel(
        `${parts.date} · ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} IST`
      );
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
        .then((res) => {
          if (!stop) setCount(res.unread);
        })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 20000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);
  return count;
}

export function AdminShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      user={user}
      links={adminLinks}
      home="/admin/dashboard"
      bottom={[adminLinks[0], adminLinks[1], adminLinks[8], adminLinks[9]]}
      sections={adminSections}
    >
      {children}
    </AppShell>
  );
}

export function StudentShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const studentSections = [{ label: "Navigation", links: studentLinks }];
  return (
    <AppShell
      user={user}
      links={studentLinks}
      home="/student/dashboard"
      bottom={studentLinks}
      sections={studentSections}
    >
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
  const noticeHref =
    user.role === "ADMIN" ? "/admin/notifications" : "/student/notifications";
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        background: "rgba(28, 28, 30, 0.97)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "1.25rem 1.125rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "10px",
              background: "#0071e3",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2" />
              <path d="M7 12h5" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16.5" cy="12" r="1.5" fill="white" />
            </svg>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              SmartAttend
            </span>
            <span
              style={{
                display: "block",
                fontSize: "0.625rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Crestview University
            </span>
          </div>
        </Link>
      </div>

      {/* User card */}
      <div
        style={{
          padding: "0.75rem 0.875rem",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            borderRadius: "12px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "0.625rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0071e3, #5e5ce6)",
              display: "grid",
              placeItems: "center",
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              {user.name}
            </p>
            <p
              style={{
                fontSize: "0.625rem",
                color: "rgba(255,255,255,0.4)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {user.role === "ADMIN" ? "Administrator" : "Student"}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              flexShrink: 0,
            }}
          >
            <span className="pulse-dot" style={{ width: "6px", height: "6px" }} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.625rem" }}>
        {sections.map(({ label, links: sectionLinks }) => (
          <div key={label} style={{ marginBottom: "0.25rem" }}>
            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                padding: "0.625rem 0.625rem 0.25rem",
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
                    gap: "0.625rem",
                    borderRadius: "10px",
                    padding: "0.5rem 0.625rem",
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                    textDecoration: "none",
                    marginBottom: "1px",
                    transition: "all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    position: "relative",
                    background: active
                      ? "rgba(0, 113, 227, 0.18)"
                      : "transparent",
                    color: active ? "#4db3ff" : "rgba(255,255,255,0.55)",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "rgba(255,255,255,0.85)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "rgba(255,255,255,0.55)";
                    }
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        height: "55%",
                        width: "3px",
                        borderRadius: "0 2px 2px 0",
                        background: "#0071e3",
                      }}
                    />
                  )}
                  <Icon
                    size={16}
                    style={{
                      color: active ? "#4db3ff" : "rgba(255,255,255,0.35)",
                      flexShrink: 0,
                      transition: "color 0.2s",
                    }}
                  />
                  <span>{link.label}</span>
                  {link.href === "/admin/attendance/live" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#30d158",
                        animation: "pulse-ring 2.4s infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div
        style={{
          padding: "0.75rem 0.625rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={logout}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "0.625rem",
            borderRadius: "10px",
            padding: "0.5rem 0.625rem",
            fontSize: "0.875rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.4)",
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255, 59, 48, 0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "#ff6961";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.4)";
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block"
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          width: "15rem",
          overflowY: "auto",
        }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.button
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.48)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              style={{
                position: "relative",
                height: "100%",
                width: "15rem",
              }}
            >
              <button
                style={{
                  position: "absolute",
                  right: "0.875rem",
                  top: "1rem",
                  color: "rgba(255,255,255,0.5)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                }}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top header — Apple-style translucent nav bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0 1.5rem",
            height: "52px",
            background: "rgba(245, 245, 247, 0.85)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "rgba(0,0,0,0.06)",
                border: "none",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#1d1d1f",
                transition: "background 0.2s",
              }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#0071e3",
                  letterSpacing: "-0.005em",
                  lineHeight: 1.2,
                }}
              >
                {user.role === "ADMIN" ? "Administrator Portal" : "Student Portal"}
              </p>
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 400,
                  color: "#86868b",
                  letterSpacing: "-0.003em",
                }}
              >
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
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "rgba(0,0,0,0.06)",
                display: "grid",
                placeItems: "center",
                color: "#1d1d1f",
                transition: "background 0.2s",
              }}
              aria-label="Notifications"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(0, 113, 227, 0.1)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#0071e3";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(0,0,0,0.06)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#1d1d1f";
              }}
            >
              <Bell size={17} />
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    minWidth: "17px",
                    height: "17px",
                    borderRadius: "999px",
                    background: "#ff3b30",
                    color: "white",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    padding: "0 3px",
                    border: "1.5px solid #f5f5f7",
                    letterSpacing: "0",
                  }}
                >
                  {unread}
                </span>
              )}
            </Link>

            {/* User badge */}
            <Link
              href={home}
              className="hidden sm:flex"
              style={{
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.625rem",
                borderRadius: "9px",
                background: "rgba(0,0,0,0.06)",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(0, 113, 227, 0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(0,0,0,0.06)";
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #0071e3, #5e5ce6)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#1d1d1f",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {user.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.625rem",
                    color: "#86868b",
                    letterSpacing: "-0.003em",
                  }}
                >
                  {user.email}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            padding: "1.75rem 1.5rem 6rem",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — Apple tab bar style */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
        style={{
          background: "rgba(245, 245, 247, 0.9)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderTop: "1px solid rgba(0,0,0,0.1)",
          display: "grid",
          gridTemplateColumns: `repeat(${bottom.length}, 1fr)`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "0.5rem",
          paddingRight: "0.5rem",
          paddingTop: "0.25rem",
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2px",
                padding: "0.375rem 0 0.5rem",
                textDecoration: "none",
                color: active ? "#0071e3" : "#86868b",
                transition: "color 0.2s",
              }}
            >
              <Icon size={22} />
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "-0.003em",
                }}
              >
                {link.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
