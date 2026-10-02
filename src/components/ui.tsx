"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?:
    | "neutral"
    | "present"
    | "late"
    | "absent"
    | "half"
    | "leave"
    | "online"
    | "offline"
    | "info"
    | "danger";
}) {
  const toneStyles: Record<string, { bg: string; color: string }> = {
    neutral: { bg: "rgba(0,0,0,0.06)", color: "#6e6e73" },
    present: { bg: "rgba(48, 209, 88, 0.12)", color: "#1a7f37" },
    late: { bg: "rgba(255, 159, 10, 0.12)", color: "#b5691b" },
    absent: { bg: "rgba(255, 59, 48, 0.1)", color: "#c0392b" },
    half: { bg: "rgba(94, 92, 230, 0.1)", color: "#4a48b5" },
    leave: { bg: "rgba(90, 200, 250, 0.12)", color: "#0a7fa3" },
    online: { bg: "rgba(48, 209, 88, 0.12)", color: "#1a7f37" },
    offline: { bg: "rgba(0,0,0,0.06)", color: "#86868b" },
    info: { bg: "rgba(0, 113, 227, 0.1)", color: "#0056b8" },
    danger: { bg: "rgba(255, 59, 48, 0.1)", color: "#c0392b" },
  };
  const s = toneStyles[tone] || toneStyles.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        borderRadius: "980px",
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "-0.003em",
        background: s.bg,
        color: s.color,
      }}
    >
      {tone === "online" && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#30d158",
            display: "inline-block",
            animation: "pulse-ring 2.4s infinite",
          }}
        />
      )}
      {children}
    </span>
  );
}

export function statusTone(status?: string | null) {
  const key = (status || "").toLowerCase();
  if (
    key === "present" ||
    key === "active" ||
    key === "connected" ||
    key === "assigned" ||
    key === "online"
  )
    return "present" as const;
  if (key === "late") return "late" as const;
  if (
    key === "absent" ||
    key === "inactive" ||
    key === "blocked" ||
    key === "offline"
  )
    return "absent" as const;
  if (key === "half day") return "half" as const;
  if (key === "leave") return "leave" as const;
  if (key === "not registered" || key === "unassigned") return "offline" as const;
  return "info" as const;
}

export function StatusBadge({ status }: { status?: string | null }) {
  return <Badge tone={statusTone(status)}>{status || "—"}</Badge>;
}

export function DashboardCard({
  label,
  value,
  hint,
  icon,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="apple-card"
      style={{ padding: "1.25rem 1.375rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "0.875rem",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#86868b",
          }}
        >
          {label}
        </p>
        {icon && (
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(0, 113, 227, 0.08)",
              color: "#0071e3",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#1d1d1f",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {hint && (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 400,
            color: "#86868b",
            letterSpacing: "-0.003em",
          }}
        >
          {hint}
        </p>
      )}
    </motion.article>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className="apple-card"
      style={{ padding: "1.25rem 1.375rem" }}
    >
      <div
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.0625rem",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "#1d1d1f",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.8125rem",
                fontWeight: 400,
                color: "#86868b",
                letterSpacing: "-0.003em",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.36)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: wide ? "56rem" : "38rem",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                marginBottom: "1.25rem",
                paddingBottom: "1rem",
                borderBottom: "1px solid rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#1d1d1f",
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h3>
                {subtitle && (
                  <p
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.875rem",
                      color: "#86868b",
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  color: "#6e6e73",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
                onClick={onClose}
                aria-label="Close dialog"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,0,0,0.06)";
                }}
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LoadingState({ label = "Loading records" }: { label?: string }) {
  return (
    <div
      className="apple-card"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "12rem",
        padding: "2rem",
        color: "#86868b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          fontSize: "0.9375rem",
          fontWeight: 400,
          color: "#6e6e73",
        }}
      >
        <Loader2
          style={{ color: "#0071e3", animation: "spin 1s linear infinite" }}
          size={18}
        />
        {label}…
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        padding: "3.5rem 1.5rem",
        textAlign: "center",
      }}
    >
      <span
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          background: "rgba(0,0,0,0.05)",
          display: "grid",
          placeItems: "center",
          color: "#86868b",
        }}
      >
        <Inbox size={22} />
      </span>
      <h3
        style={{
          marginTop: "1rem",
          fontSize: "1.0625rem",
          fontWeight: 700,
          color: "#1d1d1f",
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          marginTop: "0.375rem",
          fontSize: "0.875rem",
          color: "#86868b",
          maxWidth: "28rem",
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {action && <div style={{ marginTop: "1.25rem" }}>{action}</div>}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ position: "relative", display: "block", flex: 1, minWidth: 0 }}>
      <Search
        size={15}
        style={{
          position: "absolute",
          left: "0.75rem",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#86868b",
          pointerEvents: "none",
        }}
      />
      <input
        className="field"
        style={{ paddingLeft: "2.25rem" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        paddingTop: "1rem",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "#86868b" }}>
        Page {page} of {pages}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn btn-secondary btn-sm btn-rect"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          style={{ borderRadius: "10px", gap: "0.25rem" }}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          className="btn btn-secondary btn-sm btn-rect"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          style={{ borderRadius: "10px", gap: "0.25rem" }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: {
    key: string;
    label: string;
    render?: (row: Record<string, unknown>) => ReactNode;
    className?: string;
  }[];
  rows: Record<string, unknown>[];
  empty?: ReactNode;
}) {
  if (!rows.length)
    return (
      <>
        {empty || (
          <EmptyState
            title="Nothing to show"
            message="Adjust the filters or add a new record."
          />
        )}
      </>
    );
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render
                    ? column.render(row)
                    : String(row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          {eyebrow && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "980px",
                background: "rgba(0, 113, 227, 0.08)",
                padding: "0.2rem 0.625rem",
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: "#0071e3",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              {eyebrow}
            </span>
          )}
          <h1
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#1d1d1f",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                marginTop: "0.375rem",
                fontSize: "0.9375rem",
                fontWeight: 400,
                color: "#6e6e73",
                maxWidth: "42rem",
                lineHeight: 1.5,
                letterSpacing: "-0.01em",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        className="label"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "#86868b",
              fontWeight: 400,
            }}
          >
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
