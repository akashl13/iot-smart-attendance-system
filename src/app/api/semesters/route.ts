import { createSemesterHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  return createSemesterHandler(req);
}
