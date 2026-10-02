import { getRfidHandler, updateRfidHandler, deleteRfidHandler } from "@/server/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const { uid } = await ctx.params;
  return getRfidHandler(req, uid);
}

export async function PUT(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const { uid } = await ctx.params;
  return updateRfidHandler(req, uid);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const { uid } = await ctx.params;
  return deleteRfidHandler(req, uid);
}
