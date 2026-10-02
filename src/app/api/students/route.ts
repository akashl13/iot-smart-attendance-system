import { listStudentsHandler, createStudentHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listStudentsHandler(req);
}

export async function POST(req: Request) {
  return createStudentHandler(req);
}
