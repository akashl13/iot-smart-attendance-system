import { LoginForm } from "@/components/auth-forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = params.role === "admin" ? "admin" : "student";
  const showDemo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_CREDENTIALS === "true";
  return <LoginForm key={role} initialRole={role} showDemo={showDemo} />;
}
