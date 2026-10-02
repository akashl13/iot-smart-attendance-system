import { listSubjectsHandler, createSubjectHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listSubjectsHandler(req);
}

export async function POST(req: Request) {
  return createSubjectHandler(req);
}
