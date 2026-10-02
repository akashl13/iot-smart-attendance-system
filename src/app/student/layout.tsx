import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StudentShell } from "@/components/shells";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");
  if (user.role !== "STUDENT") redirect("/admin/dashboard");
  return <StudentShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</StudentShell>;
}
