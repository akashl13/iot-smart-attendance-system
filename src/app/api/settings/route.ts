import { settingsGetHandler, settingsPutHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return settingsGetHandler(req);
}

export async function PUT(req: Request) {
  return settingsPutHandler(req);
}
