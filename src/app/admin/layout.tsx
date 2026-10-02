import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/shells";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=admin");
  if (user.role !== "ADMIN") redirect("/student/dashboard");
  return <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>;
}
