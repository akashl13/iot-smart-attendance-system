import "dotenv/config";
import { Client } from "pg";

const sql = process.env.DATABASE_URL;
if (!sql) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const client = new Client({ connectionString: sql });

try {
  await client.connect();
} catch (error) {
  console.error(`Could not connect to the database: ${(error as Error).message}`);
  process.exit(1);
}

const constraints = await client.query<{ conname: string; table_name: string }>(
  `select conname, relname as table_name from pg_constraint c
   join pg_class r on r.oid = c.conrelid
   where c.contype = 'c' and r.relname in
     ('users','students','subjects','semesters','sections','schedules','attendance',
      'rfid_cards','devices','attendance_anomalies')
   order by r.relname, conname`,
);

console.log(`check constraints: ${constraints.rows.length}`);
for (const r of constraints.rows) console.log(`  ${r.table_name}.${r.conname}`);

const cols = await client.query<{ table_name: string; column_name: string }>(
  `select table_name, column_name from information_schema.columns
   where (table_name, column_name) in (
     ('devices','trust_state'),('devices','scan_direction'),('devices','allowed_ips'),
     ('attendance','exit_source'),('attendance','anomaly_flags'),('attendance','duration_minutes'),
     ('rfid_scans','received_at'),('rfid_scans','source_ip'),('rfid_scans','ip_trusted'),
     ('rfid_scans','device_timestamp'))
   order by table_name, column_name`,
);
console.log(`\nnew columns present: ${cols.rows.length}`);
for (const r of cols.rows) console.log(`  ${r.table_name}.${r.column_name}`);

const idx = await client.query<{ indexname: string }>(
  `select indexname from pg_indexes
   where indexname in ('attendance_student_date_uidx','devices_trust_state_idx',
     'anomalies_student_date_idx','anomalies_reviewed_idx','rfid_scans_created_idx')
   order by indexname`,
);
console.log(`\nsample indexes present: ${idx.rows.length}`);
for (const r of idx.rows) console.log(`  ${r.indexname}`);

const dev = await client.query(`select trust_state, count(*)::int as n from devices group by 1 order by 1`);
console.log(`\ndevices by trust_state: ${JSON.stringify(dev.rows)}`);

const def = await client.query<{ column_default: string }>(
  `select column_default from information_schema.columns
   where table_name='devices' and column_name='trust_state'`,
);
console.log(`devices.trust_state default: ${def.rows[0]?.column_default}`);

await client.end().catch(() => undefined);
