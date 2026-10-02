"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; danger?: boolean };

const ToastContext = createContext<{
  push: (message: string, tone?: Tone) => void;
} | null>(null);
const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("Toast provider missing");
  return useMemo(() => ({
    success: (message: string) => ctx.push(message, "success"),
    error: (message: string) => ctx.push(message, "error"),
    info: (message: string) => ctx.push(message, "info"),
  }), [ctx]);
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("Confirm provider missing");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setConfirm({ ...options, resolve }));
  }, []);

  const toastValue = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={toastValue}>
      <ConfirmContext.Provider value={ask}>
        {children}
        <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-navy px-4 py-3 text-sm text-white shadow-2xl"
              >
                {toast.tone === "success" ? <CheckCircle2 size={18} className="mt-0.5 text-teal-200" /> : toast.tone === "error" ? <AlertTriangle size={18} className="mt-0.5 text-rose-200" /> : <Info size={18} className="mt-0.5 text-amber-100" />}
                <p className="flex-1 leading-5">{toast.message}</p>
                <button className="text-white/70" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss">
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {confirm && (
            <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-navy/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
                <h3 className="font-display text-2xl text-navy">{confirm.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{confirm.message}</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button className="btn btn-ghost" onClick={() => { confirm.resolve(false); setConfirm(null); }}>Cancel</button>
                  <button className={`btn ${confirm.danger ? "btn-danger" : "btn-primary"}`} onClick={() => { confirm.resolve(true); setConfirm(null); }}>
                    {confirm.confirmLabel || "Confirm"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
