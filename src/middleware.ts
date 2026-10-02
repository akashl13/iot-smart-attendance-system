import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const allowedOrigin = process.env.CLIENT_URL || "http://localhost:3000";
  const origin = request.headers.get("origin");
  const corsOrigin = origin === allowedOrigin ? origin : allowedOrigin;

  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-device-key",
    "Access-Control-Max-Age": "86400",
  };
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
