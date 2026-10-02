"use client";

import { motion } from "framer-motion";
import { Radio, ScanLine } from "lucide-react";

export function RFIDScannerCard({
  uid,
  scanning,
  onScan,
  onChange,
  actionLabel = "Scan RFID Card",
  caption = "Development scanner",
}: {
  uid: string;
  scanning?: boolean;
  onScan?: () => void;
  onChange?: (value: string) => void;
  actionLabel?: string;
  caption?: string;
}) {
  return (
    <div className="scan-frame p-5">
      {scanning && <div className="scan-beam" />}
      <div className="relative z-10">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/60">
          <span className="inline-flex items-center gap-2"><Radio size={14} /> RC522</span>
          <span>{caption}</span>
        </div>
        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">RFID UID</p>
            <p className="mt-1 font-mono text-3xl tracking-[0.18em] text-white">{uid || "— — — —"}</p>
          </div>
          <motion.span animate={scanning ? { rotate: [0, 8, -8, 0] } : {}} transition={{ repeat: scanning ? Infinity : 0, duration: 1.1 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
            <ScanLine />
          </motion.span>
        </div>
        {onChange && (
          <input className="field mt-6 border-white/10 bg-white/10 text-white placeholder:text-white/40" value={uid} onChange={(event) => onChange(event.target.value.toUpperCase())} placeholder="A3 7F 21 9C" />
        )}
        {onScan && (
          <button type="button" className="btn btn-light mt-4 w-full" onClick={onScan} disabled={scanning}>
            {scanning ? "Reading card..." : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
