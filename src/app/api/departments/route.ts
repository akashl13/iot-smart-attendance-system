import { listDepartmentsHandler, createDepartmentHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listDepartmentsHandler(req);
}

export async function POST(req: Request) {
  return createDepartmentHandler(req);
}
