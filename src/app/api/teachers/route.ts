import { listTeachersHandler, createTeacherHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listTeachersHandler(req);
}

export async function POST(req: Request) {
  return createTeacherHandler(req);
}
