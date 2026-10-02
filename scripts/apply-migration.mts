/**
 * Applies the hand-written alignment migration in `drizzle/` to the database in
 * `DATABASE_URL`. Each statement runs independently so that one failure (for
 * example a unique index that existing duplicates block) is reported without
 * discarding the rest of the migration, and so a re-run is safe.
 *
 * Every statement in the file is guarded (IF NOT EXISTS / DO $$ ... EXCEPTION),
 * so running it repeatedly is safe.
 *
 * Usage: npx tsx scripts/apply-migration.mts [file]
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const defaultTag = "0000_align_schema";

/**
 * Resolved from the Drizzle journal so this default can never drift away from
 * the migration that is actually present in `drizzle/`.
 */
async function defaultMigrationFile() {
  try {
    const journal = JSON.parse(
      await readFile(resolve("drizzle/meta/_journal.json"), "utf8"),
    ) as { entries?: Array<{ tag?: string }> };
    const tag = journal.entries?.at(-1)?.tag;
    if (tag) return `drizzle/${tag}.sql`;
  } catch {
    // Journal unreadable; fall through to the hardcoded tag.
  }
  return `drizzle/${defaultTag}.sql`;
}

const file = resolve(process.argv[2] ?? (await defaultMigrationFile()));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

let raw: string;
try {
  raw = await readFile(file, "utf8");
} catch {
  console.error(`Migration file not found: ${file}`);
  console.error("Pass an explicit path: npx tsx scripts/apply-migration.mts <file>");
  process.exit(1);
}
const statements = raw
  .split("--> statement-breakpoint")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

if (!statements.length) {
  console.error(`No statements found in ${file}. Refusing to run an empty migration.`);
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined });
try {
  await client.connect();
} catch (error) {
  // Without this the driver dumps a raw connection-error stack, which reads
  // like an application fault rather than "Postgres is not reachable".
  console.error(`Could not connect to the database: ${(error as Error).message}`);
  process.exit(1);
}

let ok = 0;
const failures: Array<{ index: number; sql: string; error: string }> = [];
for (const [index, sql] of statements.entries()) {
  try {
    await client.query(sql);
    ok += 1;
  } catch (error) {
    failures.push({ index, sql: sql.slice(0, 90).replace(/\s+/g, " "), error: (error as Error).message });
  }
}

await client.end().catch(() => undefined);

console.log(`applied ${ok}/${statements.length} statements from ${file}`);
for (const failure of failures) {
  console.error(`\n[${failure.index}] ${failure.sql}\n    -> ${failure.error}`);
}
if (failures.length) {
  console.error(`\n${failures.length} statement(s) failed. The rest were applied; the file is guarded, so re-running is safe.`);
}
process.exit(failures.length ? 1 : 0);
