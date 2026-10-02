import { logoutHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return logoutHandler();
}
