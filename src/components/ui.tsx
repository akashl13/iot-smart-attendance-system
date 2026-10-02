"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "present" | "late" | "absent" | "half" | "leave" | "online" | "offline" | "info" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
    present: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    late: "bg-amber-50 text-amber-700 border-amber-200/70",
    absent: "bg-rose-50 text-rose-700 border-rose-200/70",
    half: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    leave: "bg-sky-50 text-sky-700 border-sky-200/70",
    online: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    offline: "bg-slate-100 text-slate-500 border-slate-200",
    info: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    danger: "bg-rose-50 text-rose-700 border-rose-200/70",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.neutral}`}>
      {tone === "online" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {children}
    </span>
  );
}

export function statusTone(status?: string | null) {
  const key = (status || "").toLowerCase();
  if (key === "present" || key === "active" || key === "connected" || key === "assigned" || key === "online") return "present" as const;
  if (key === "late") return "late" as const;
  if (key === "absent" || key === "inactive" || key === "blocked" || key === "offline") return "absent" as const;
  if (key === "half day") return "half" as const;
  if (key === "leave") return "leave" as const;
  if (key === "not registered" || key === "unassigned") return "offline" as const;
  return "info" as const;
}

export function StatusBadge({ status }: { status?: string | null }) {
  return <Badge tone={statusTone(status)}>{status || "—"}</Badge>;
}

export function DashboardCard({ label, value, hint, icon, delay = 0 }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; delay?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="panel p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        {icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50/80 text-indigo-600 shadow-sm border border-indigo-100/60">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
    </motion.article>
  );
}

export function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Modal({ open, title, subtitle, onClose, children, wide = false }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Glassmorphic backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
          
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
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
    <div className="panel grid min-h-48 place-items-center p-8 text-slate-500">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 className="animate-spin text-indigo-600" size={18} />
        {label}...
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Inbox size={22} /></span>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="field pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm border-t border-slate-100">
      <p className="text-slate-500 font-medium">Page {page} of {pages}</p>
      <div className="flex gap-2">
        <button className="btn btn-ghost px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Prev</button>
        <button className="btn btn-ghost px-3 py-1.5 text-xs" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, empty }: { columns: { key: string; label: string; render?: (row: Record<string, unknown>) => ReactNode; className?: string }[]; rows: Record<string, unknown>[]; empty?: ReactNode }) {
  if (!rows.length) return <>{empty || <EmptyState title="Nothing to show" message="Adjust the filters or add a new record." />}</>;
  return (
    <div className="table-wrap border border-slate-200/80 rounded-xl overflow-hidden bg-white">
      <table className="data">
        <thead>
          <tr>{columns.map((column) => <th key={column.key} className={column.className}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>{column.render ? column.render(row) : String(row[column.key] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 tracking-wide">{eyebrow}</span>}
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className="text-[11px] text-slate-400 font-normal lowercase">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
