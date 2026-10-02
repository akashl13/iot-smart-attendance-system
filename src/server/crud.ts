import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { zodMessage } from "@/lib/validators";
import type { SessionUser } from "@/lib/auth";
import { ensureSeed } from "@/server/seed";
import { clientIp, fail, handleError, ok, parseId, rateLimit, readBody, requireUser } from "@/server/http";

type CrudMessages = {
  created: string;
  updated: string;
  deleted: string;
  notFound: string;
};

/** A Drizzle table that is addressable by a numeric `id` primary key. */
export type CrudTable = PgTable & { id: AnyPgColumn };

export type CrudConfig = {
  /** Drizzle table to operate on. Must expose a numeric `id` primary key. */
  table: CrudTable;
  /** Zod schema used to validate request bodies. */
  schema: z.ZodType;
  /** Transforms validated input into column values (uppercasing, renaming, defaults). */
  mapValues?: (data: any) => Record<string, unknown>;
  /** Human readable messages, one per operation. */
  messages: CrudMessages;
  /** Response key for the created row, e.g. "subject". Defaults to "record". */
  key?: string;
  /** Set to true for entities that expose no PUT route. */
  skipUpdate?: boolean;
  /** Roles allowed to mutate the entity. Defaults to ADMIN only. */
  roles?: Array<SessionUser["role"]>;
  /** Per-IP mutation budget. Pass `false` to disable. Defaults to 60 requests / 60s. */
  rateLimit?: false | { limit?: number; windowMs?: number; message?: string };
  /** Await the one-time seed guard before mutating, like the list handlers do. Defaults to true. */
  seed?: boolean;
};

/** Default per-IP mutation budget applied when `rateLimit` is not configured. */
const DEFAULT_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/**
 * Builds the create / update / delete handlers for a simple lookup-table entity.
 * All handlers share the same role check, rate limit, zod validation, value mapping
 * and 404 / error shape, so an entity only declares its table, schema and messages.
 */
export function makeCrudHandlers({
  table,
  schema,
  mapValues,
  messages,
  key = "record",
  skipUpdate = false,
  roles = ["ADMIN"],
  rateLimit: limitConfig = DEFAULT_RATE_LIMIT,
  seed = true,
}: CrudConfig) {
  const values = (data: unknown) => (mapValues ? mapValues(data) : data);

  /**
   * Shared preamble: optional seed guard, role check and per-IP rate limit.
   * Returns a Response to short-circuit on, or null to continue.
   */
  async function guard(action: string, req: Request) {
    if (seed) await ensureSeed();
    const auth = await requireUser(roles, req);
    if (auth.error) return auth.error;
    if (!limitConfig) return null;
    const budget = limitConfig.limit ?? DEFAULT_RATE_LIMIT.limit;
    if (budget > 0) {
      const limited = rateLimit(`crud:${action}:${key}:${clientIp(req)}`, budget, limitConfig.windowMs ?? DEFAULT_RATE_LIMIT.windowMs);
      if (!limited.ok) return fail(limitConfig.message ?? "Too many requests. Please wait and try again.", 429);
    }
    return null;
  }

  /** Reads and validates the request body, returning either parsed data or a Response. */
  async function parseBody(req: Request): Promise<{ data: unknown } | { error: Response }> {
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return { error: fail("Invalid request body.", 400) };
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { error: fail(zodMessage(parsed.error), 400) };
    return { data: parsed.data };
  }

  async function create(req: Request) {
    try {
      const blocked = await guard("create", req);
      if (blocked) return blocked;
      const body = await parseBody(req);
      if ("error" in body) return body.error;
      const row = (await db.insert(table).values(values(body.data) as never).returning()) as unknown as Record<string, unknown>[];
      if (!row.length) return fail("The record could not be created.", 500);
      return ok({ message: messages.created, [key]: row[0] });
    } catch (error) {
      return handleError(error);
    }
  }

  async function update(req: Request, id: string) {
    try {
      const blocked = await guard("update", req);
      if (blocked) return blocked;
      const targetId = parseId(id);
      if (targetId instanceof Response) return targetId;
      const body = await parseBody(req);
      if ("error" in body) return body.error;
      const row = (await db
        .update(table)
        .set(values(body.data) as never)
        .where(eq(table.id, targetId))
        .returning()) as Record<string, unknown>[];
      if (!row.length) return fail(messages.notFound, 404);
      return ok({ message: messages.updated, [key]: row[0] });
    } catch (error) {
      return handleError(error);
    }
  }

  async function remove(req: Request, id: string) {
    try {
      const blocked = await guard("delete", req);
      if (blocked) return blocked;
      const targetId = parseId(id);
      if (targetId instanceof Response) return targetId;
      const row = (await db.delete(table).where(eq(table.id, targetId)).returning()) as Record<string, unknown>[];
      if (!row.length) return fail(messages.notFound, 404);
      return ok({ message: messages.deleted });
    } catch (error) {
      return handleError(error);
    }
  }

  return { create, update: skipUpdate ? undefined : update, remove };
}
