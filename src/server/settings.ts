import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/constants";

export async function getSettings() {
  const rows = await db.select().from(settings);
  const map = { ...DEFAULT_SETTINGS } as Record<SettingKey, string>;
  for (const row of rows) {
    if (row.key in map) map[row.key as SettingKey] = row.value;
  }
  return {
    ...map,
    cooldownSeconds: Number(map.cooldownSeconds),
    halfDayHours: Number(map.halfDayHours),
    lowAttendance: Number(map.lowAttendance),
    autoCloseGraceMinutes: Number(map.autoCloseGraceMinutes),
    enforceDeviceIps: map.enforceDeviceIps === "true",
    requireTrustedDevices: map.requireTrustedDevices !== "false",
    blockAfterProxyAttempt: map.blockAfterProxyAttempt === "true",
  };
}

export async function saveSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  return getSettings();
}

export async function touchSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function settingExists(key: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return Boolean(row);
}
