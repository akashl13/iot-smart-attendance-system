import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students, users } from "@/db/schema";
import { TOKEN_COOKIE } from "@/lib/constants";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  student: typeof students.$inferSelect | null;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  return value;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { id: number; role: string; email: string }) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret(), { expiresIn: "7d" });
}

type TokenPayload = { sub: number; role: "ADMIN" | "STUDENT"; email: string };

const tokenPayloadSchema = z.object({
  sub: z.coerce.number().int(),
  role: z.enum(["ADMIN", "STUDENT"]),
  email: z.email().optional(),
});

export function readToken(token: string): { ok: true; payload: TokenPayload } | { ok: false; message: string } {
  try {
    const decoded = jwt.verify(token, secret());
    const parsed = tokenPayloadSchema.safeParse(decoded);
    if (!parsed.success) return { ok: false, message: "Unauthorized request" };
    return { ok: true, payload: { sub: parsed.data.sub, role: parsed.data.role, email: parsed.data.email ?? "" } };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { ok: false as const, message: "Session expired. Please sign in again." };
    }
    return { ok: false as const, message: "Unauthorized request" };
  }
}

export async function setAuthCookie(token: string) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
}

export async function getSessionUser(tokenOverride?: string): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = tokenOverride ?? jar.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const decoded = readToken(token);
  if (!decoded.ok) return null;
  const [user] = await db.select().from(users).where(eq(users.id, decoded.payload.sub)).limit(1);
  if (!user) return null;
  const [student] = user.role === "STUDENT" ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1) : [null];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "ADMIN" | "STUDENT",
    student: student ?? null,
  };
}
