import { listAttendanceHandler, createAttendanceHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listAttendanceHandler(req);
}

export async function POST(req: Request) {
  return createAttendanceHandler(req);
}
