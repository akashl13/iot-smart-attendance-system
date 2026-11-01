import { studentAccountsHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return studentAccountsHandler(req);
}

export async function POST(req: Request) {
  return studentAccountsHandler(req);
}
