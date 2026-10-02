const TZ = "Asia/Kolkata";

export function kolkataParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekdayMap[parts.weekday] ?? 0,
    weekdayLabel: parts.weekday,
  };
}

export function todayKolkata() {
  return kolkataParts().date;
}

export function kolkataDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0));
}

export function shiftKolkataDate(dateStr: string, days: number) {
  const noon = kolkataDateTime(dateStr, "12:00");
  noon.setUTCDate(noon.getUTCDate() + days);
  return kolkataParts(noon).date;
}

export function weekdayOf(dateStr: string) {
  return kolkataParts(kolkataDateTime(dateStr, "12:00")).weekday;
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? kolkataDateTime(value, "12:00") : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatRelative(value: Date | string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "Never";
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function minutesOf(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function normalizeUid(raw: string) {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (hex.length < 8 || hex.length > 16 || hex.length % 2 !== 0) return null;
  return hex.match(/.{2}/g)!.join(" ");
}

export function randomUid() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function percentage(score: number, total: number) {
  if (!total) return 0;
  return Math.round((score / total) * 1000) / 10;
}

export function attendanceScore(rows: { status: string }[]) {
  const counted = rows.filter((row) => row.status !== "Leave");
  const score = counted.reduce((sum, row) => {
    if (row.status === "Present" || row.status === "Late") return sum + 1;
    if (row.status === "Half Day") return sum + 0.5;
    return sum;
  }, 0);
  return {
    total: rows.length,
    counted: counted.length,
    present: rows.filter((row) => row.status === "Present").length,
    late: rows.filter((row) => row.status === "Late").length,
    absent: rows.filter((row) => row.status === "Absent").length,
    half: rows.filter((row) => row.status === "Half Day").length,
    leave: rows.filter((row) => row.status === "Leave").length,
    percentage: percentage(score, counted.length),
  };
}

export function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: TZ }).format(new Date(Date.UTC(year, mon - 1, 1)));
}

export function currentMonth() {
  return todayKolkata().slice(0, 7);
}
