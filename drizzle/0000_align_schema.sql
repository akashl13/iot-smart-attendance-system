-- Aligns the live database with src/db/schema.ts, then adds integrity constraints.
--
-- The deployed database predates four schema features the application already
-- reads and writes (devices reader trust, attendance integrity fields, the
-- anomaly review queue, and RFID scan provenance). Every statement is guarded so
-- the file is safe to run against a database that is partially up to date.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Missing tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "attendance_anomalies" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"attendance_id" integer,
	"date" date NOT NULL,
	"kind" varchar(40) NOT NULL,
	"detail" text,
	"device_id" varchar(40),
	"severity" varchar(20) DEFAULT 'warning' NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Missing columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "allowed_ips" text;
--> statement-breakpoint
-- Existing readers were provisioned before reader trust existed, so they are
-- grandfathered as ACTIVE: they are already installed in the field and must keep
-- marking attendance.
--
-- The backfill is done by the column DEFAULT, not by an UPDATE. ADD COLUMN assigns
-- the default to existing rows, and the default is then flipped to PENDING for all
-- future inserts. A subsequent `UPDATE ... WHERE trust_state = 'PENDING'` would be a
-- trust escalation: it would also match a reader an admin registered after the
-- upgrade and deliberately left untrusted, silently promoting it on every re-run.
-- With no UPDATE, the statement is naturally idempotent.
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "trust_state" varchar(20) DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint
-- Column now exists (added just above with the grandfathering default, or already
-- present from a previous run). Flip the default for all future inserts.
ALTER TABLE "devices" ALTER COLUMN "trust_state" SET DEFAULT 'PENDING';
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "scan_direction" varchar(10) DEFAULT 'AUTO' NOT NULL;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "latitude" varchar(20);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "longitude" varchar(20);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "exit_source" varchar(20) DEFAULT 'SCAN' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "anomaly_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;
--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD COLUMN IF NOT EXISTS "device_timestamp" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD COLUMN IF NOT EXISTS "source_ip" varchar(64);
--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD COLUMN IF NOT EXISTS "ip_trusted" boolean;

-- The reader-trust backfill above is complete: the column was added with a
-- default of ACTIVE (so pre-existing rows were grandfathered) and the default was
-- then set back to PENDING (so every future reader must be enrolled explicitly).
-- No UPDATE statement is used, which makes the whole migration naturally
-- idempotent — a re-run cannot escalate a deliberately-untrusted reader.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. New indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "courses_department_code_uidx" ON "courses" USING btree ("department_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teachers_department_idx" ON "teachers" USING btree ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subjects_department_idx" ON "subjects" USING btree ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subjects_teacher_idx" ON "subjects" USING btree ("teacher_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_department_idx" ON "students" USING btree ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_status_idx" ON "students" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_course_semester_section_idx" ON "students" USING btree ("course_id","semester","section");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedules_lookup_idx" ON "schedules" USING btree ("course_id","semester","day_of_week");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedules_subject_idx" ON "schedules" USING btree ("subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "devices_trust_state_idx" ON "devices" USING btree ("trust_state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfid_cards_student_idx" ON "rfid_cards" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfid_scans_uid_created_idx" ON "rfid_scans" USING btree ("rfid_uid","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfid_scans_device_created_idx" ON "rfid_scans" USING btree ("device_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_student_idx" ON "attendance" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_date_subject_idx" ON "attendance" USING btree ("date","subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_date_status_idx" ON "attendance" USING btree ("date","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_logs_attendance_idx" ON "attendance_logs" USING btree ("attendance_id","timestamp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomalies_student_date_idx" ON "attendance_anomalies" USING btree ("student_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomalies_reviewed_idx" ON "attendance_anomalies" USING btree ("reviewed");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomalies_date_idx" ON "attendance_anomalies" USING btree ("date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomalies_attendance_idx" ON "attendance_anomalies" USING btree ("attendance_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read","created_at");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Value-domain CHECK constraints
--    Each is added in its own DO block: if existing data violates one, the error
--    is reported per-constraint instead of aborting the whole migration.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK (role in ('ADMIN','STUDENT')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped users_role_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "students" ADD CONSTRAINT "students_status_check" CHECK (status in ('ACTIVE','INACTIVE')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped students_status_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "students" ADD CONSTRAINT "students_semester_check" CHECK (semester >= 1); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped students_semester_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "subjects" ADD CONSTRAINT "subjects_semester_check" CHECK (semester >= 1); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped subjects_semester_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "semesters" ADD CONSTRAINT "semesters_number_check" CHECK (number >= 1); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped semesters_number_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "sections" ADD CONSTRAINT "sections_semester_number_check" CHECK (semester_number >= 1); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped sections_semester_number_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "schedules" ADD CONSTRAINT "schedules_semester_check" CHECK (semester >= 1); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped schedules_semester_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "schedules" ADD CONSTRAINT "schedules_day_of_week_check" CHECK (day_of_week between 0 and 6); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped schedules_day_of_week_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "schedules" ADD CONSTRAINT "schedules_start_time_check" CHECK (start_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped schedules_start_time_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "schedules" ADD CONSTRAINT "schedules_end_time_check" CHECK (end_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped schedules_end_time_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "schedules" ADD CONSTRAINT "schedules_time_order_check" CHECK (end_time > start_time); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped schedules_time_order_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance" ADD CONSTRAINT "attendance_status_check" CHECK (status in ('Present','Late','Absent','Half Day','Leave')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_status_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance" ADD CONSTRAINT "attendance_exit_source_check" CHECK (exit_source in ('SCAN','AUTO_CLOSE','MANUAL')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_exit_source_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance" ADD CONSTRAINT "attendance_duration_check" CHECK (duration_minutes is null or duration_minutes >= 0); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_duration_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance" ADD CONSTRAINT "attendance_exit_after_entry_check" CHECK (exit_time is null or entry_time is null or exit_time >= entry_time); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_exit_after_entry_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_status_check" CHECK (status in ('ASSIGNED','UNASSIGNED','BLOCKED')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped rfid_cards_status_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_assignment_check" CHECK ((status = 'UNASSIGNED' and student_id is null) or (status <> 'UNASSIGNED' and student_id is not null)); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped rfid_cards_assignment_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "devices" ADD CONSTRAINT "devices_status_check" CHECK (status in ('ONLINE','OFFLINE')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped devices_status_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "devices" ADD CONSTRAINT "devices_trust_state_check" CHECK (trust_state in ('PENDING','ACTIVE','SUSPENDED')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped devices_trust_state_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "devices" ADD CONSTRAINT "devices_scan_direction_check" CHECK (scan_direction in ('IN','OUT','AUTO')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped devices_scan_direction_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_severity_check" CHECK (severity in ('warning','critical')); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_anomalies_severity_check: %', SQLERRM; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_review_check" CHECK ((reviewed and reviewed_by is not null and reviewed_at is not null) or (not reviewed and reviewed_by is null and reviewed_at is null)); EXCEPTION WHEN others THEN RAISE NOTICE 'skipped attendance_anomalies_review_check: %', SQLERRM; END $$;
