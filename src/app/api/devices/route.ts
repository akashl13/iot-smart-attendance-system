import { listDevicesHandler, createDeviceHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return listDevicesHandler(req);
}

export async function POST(req: Request) {
  return createDeviceHandler(req);
}
