import { ZodError } from "zod";
import { getSessionUser, readToken, type SessionUser } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/constants";
import { cookies } from "next/headers";
import { zodMessage } from "@/lib/validators";

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": process.env.CLIENT_URL || "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-device-key",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
  });
}

export function ok(data: Record<string, unknown> = {}) {
  return json({ success: true, ...data });
}

export function fail(message: string | undefined, status = 400) {
  return json({ success: false, message: message || "Request failed." }, status);
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new SyntaxError("Invalid JSON body.");
  }
}

export function friendlyDbError(error: unknown) {
  // Drizzle wraps driver errors in DrizzleQueryError, so the Postgres SQLSTATE code
  // and constraint name live on `cause` rather than the thrown object itself.
  let candidate = error as { code?: string; constraint?: string; message?: string; cause?: unknown };
  const seen = new Set<unknown>();
  while (candidate && !candidate.code && candidate.cause && !seen.has(candidate.cause)) {
    seen.add(candidate.cause);
    candidate = candidate.cause as typeof candidate;
  }
  if (candidate.code === "23505") {
    const hint = `${candidate.constraint ?? ""} ${candidate.message ?? ""}`.toLowerCase();
    if (hint.includes("email")) return "An account with this email already exists.";
    if (hint.includes("student_code") || hint.includes("student id")) return "This student ID is already registered.";
    if (hint.includes("enrollment")) return "This enrollment number is already registered.";
    if (hint.includes("rfid") || hint.includes("uid")) return "This RFID card is already registered to another student.";
    if (hint.includes("teacher")) return "A teacher with these details already exists.";
    if (hint.includes("subject")) return "This subject code already exists.";
    if (hint.includes("device")) return "This device ID already exists.";
    if (hint.includes("attendance_student_date")) return "Attendance for this student and date already exists.";
    return "A duplicate record already exists.";
  }
  if (candidate.code === "23503") return "This record is in use and cannot be deleted.";
  if (candidate.code === "23502") return "Some required information is missing.";
  return null;
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) return fail(zodMessage(error), 400);
  if (error instanceof SyntaxError) return fail("Invalid request body.", 400);
  const friendly = friendlyDbError(error);
  if (friendly) return fail(friendly, 409);
  console.error(error);
  return fail("A database error occurred. Please try again.", 500);
}

export async function requireUser(roles?: Array<SessionUser["role"]>, req?: Request) {
  const jar = await cookies();
  const header = req?.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
  const token = jar.get(TOKEN_COOKIE)?.value || bearer;
  if (!token) return { error: fail("Unauthorized request", 401) };
  const decoded = readToken(token);
  if (!decoded.ok) return { error: fail(decoded.message, 401) };
  const user = await getSessionUser(token);
  if (!user) return { error: fail("Unauthorized request", 401) };
  if (roles && !roles.includes(user.role)) {
    return { error: fail("You do not have permission to perform this action.", 403) };
  }
  return { user };
}

export function pageParams(url: URL, defaultLimit = 10) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || defaultLimit) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Parses a route id into a positive integer. Returns either the number or a 400 Response,
 * so callers can bail out with `const id = parseId(raw); if (id instanceof Response) return id;`
 * instead of letting NaN reach the database.
 */
export function parseId(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return fail("Invalid id.", 400);
  return value;
}

const buckets = new Map<string, { count: number; reset: number }>();
/** Sweep threshold: once the map grows past this, expired buckets are pruned on the next call. */
const BUCKET_SWEEP_THRESHOLD = 5_000;

function sweepBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  if (buckets.size > BUCKET_SWEEP_THRESHOLD) sweepBuckets(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true as const };
  }
  if (bucket.count >= limit) {
    return { ok: false as const, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true as const };
}

export function assertDeviceKey(req: Request) {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) return null;
  const provided = req.headers.get("x-device-key");
  if (provided !== expected) return fail("Device authentication failed.", 401);
  return null;
}
