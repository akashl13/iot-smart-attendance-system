import { readAllNotificationsHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: Request) {
  return readAllNotificationsHandler(req);
}
