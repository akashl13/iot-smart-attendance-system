"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Pencil, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/providers";
import { LoadingState, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api-client";

type Account = { id: number; studentId: string; name: string; email: string; status: string };
type Listing = { accounts: Account[]; page: number; pages: number; total: number };

export default function StudentAccountsPage() {
  const toast = useToast();
  const [data, setData] = useState<Listing | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [issued, setIssued] = useState<{ id: number; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ page: String(page), limit: "20" });
      if (search.trim()) query.set("search", search.trim());
      setData((await api<{ accounts: Account[]; page: number; pages: number; total: number }>(`/api/admin/accounts?${query}`)));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load student accounts");
    }
  }, [page, search, toast]);

  useEffect(() => { void load(); }, [load]);

  async function resetPassword(account: Account) {
    if (!window.confirm(`Issue a new temporary password for ${account.name}? Their current password will stop working.`)) return;
    setBusyId(account.id);
    setIssued(null);
    try {
      const result = await api<{ temporaryPassword: string }>("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ studentId: account.id }),
      });
      setIssued({ id: account.id, password: result.temporaryPassword });
      toast.success("Temporary password issued. Copy it before leaving this page.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not reset password");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPassword() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!data) return <LoadingState label="Loading student account access" />;
  return (
    <div className="account-page">
      <PageHeader eyebrow="Registrar tools" title="Student accounts" subtitle="View each student login ID and issue a temporary password when access needs to be restored." action={<span className="account-count"><UsersRound size={16} /> {data.total} accounts</span>} />

      <section className="account-notice panel-glass">
        <KeyRound size={19} />
        <p>Passwords are stored as secure hashes, so current passwords cannot be viewed. A reset replaces the old password and reveals a new temporary password once. Share it privately and ask the student to change it in their profile.</p>
      </section>

      <section className="account-edit-callout panel-glass">
        <div><strong>Update a student profile</strong><p>Edit name, email, phone, student ID, course, semester, enrollment, status, or RFID details. Saving writes the changes to the configured Neon database.</p></div>
        <Link className="btn btn-secondary btn-sm" href="/admin/students"><Pencil size={15} /> Open student editor</Link>
      </section>

      {issued && (
        <section className="account-issued panel-glass" aria-live="polite">
          <div><span className="account-kicker">Temporary password · shown once</span><strong>{issued.password}</strong></div>
          <button className="btn btn-primary btn-sm" onClick={copyPassword}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</button>
        </section>
      )}

      <section className="account-directory panel-glass">
        <div className="account-toolbar">
          <div><h2>Login directory</h2><p>Use the email as the login ID for the student portal.</p></div>
          <label className="account-search"><Search size={16} /><input value={search} placeholder="Search name, student ID or email" onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></label>
        </div>
        <div className="table-wrap account-table-wrap">
          <table className="data">
            <thead><tr><th>Student</th><th>Student ID</th><th>Login ID · Email</th><th>Status</th><th>Manage</th></tr></thead>
            <tbody>
              {data.accounts.map((account) => (
                <tr key={account.id}>
                  <td><strong>{account.name}</strong></td>
                  <td><span className="account-id">{account.studentId}</span></td>
                  <td>{account.email}</td>
                  <td><span className={`account-status ${account.status === "ACTIVE" ? "is-active" : "is-inactive"}`}>{account.status}</span></td>
                  <td><div className="account-row-actions"><Link className="btn btn-secondary btn-sm" href={`/admin/students?edit=${account.id}`}><Pencil size={14} /> Edit details</Link><button className="btn btn-secondary btn-sm" disabled={busyId === account.id} onClick={() => void resetPassword(account)}>{busyId === account.id ? "Resetting…" : "Reset password"}</button></div></td>
                </tr>
              ))}
              {!data.accounts.length && <tr><td colSpan={5} className="account-empty">No student accounts match that search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="account-pagination"><span>Page {data.page} of {data.pages}</span><div><button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
      </section>
    </div>
  );
}
