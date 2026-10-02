"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { LoadingState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api-client";

type Note = { id: number; title: string; message: string; type: string; read: boolean; createdAt: string };

export function NotificationsBoard() {
  const toast = useToast();
  const [rows, setRows] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await api<{ data: Note[] }>("/api/notifications");
    setRows(res.data);
    setLoading(false);
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ data: Note[] }>("/api/notifications");
        if (cancelled) return;
        setRows(res.data);
        setLoading(false);
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  async function read(id: number) {
    await api(`/api/notifications/${id}/read`, { method: "PUT" });
    await load();
  }

  async function readAll() {
    await api("/api/notifications/read-all", { method: "PUT" });
    toast.success("All notifications marked as read.");
    await load();
  }

  return (
    <div>
      <PageHeader eyebrow="Alerts" title="Notifications" subtitle="Attendance confirmations, unknown cards, offline readers and policy warnings." action={<button className="btn btn-ghost" onClick={readAll}>Mark all read</button>} />
      {loading ? <LoadingState /> : (
        <div className="space-y-3">
          {rows.map((note) => (
            <article key={note.id} className={`panel flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center ${note.read ? "opacity-70" : ""}`}>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-tide">{note.type} · {note.createdAt}</p>
                <h2 className="mt-1 text-lg font-semibold">{note.title}</h2>
                <p className="text-sm text-slate-600">{note.message}</p>
              </div>
              {!note.read && <button className="btn btn-primary" onClick={() => read(note.id)}>Mark read</button>}
            </article>
          ))}
          {!rows.length && <p className="text-sm text-slate-500">No notifications yet.</p>}
        </div>
      )}
    </div>
  );
}
