export const TOKEN_COOKIE = "sa_token";

export const ATTENDANCE_STATUSES = ["Present", "Late", "Absent", "Half Day", "Leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const DEFAULT_SETTINGS = {
  institutionName: "Crestview University",
  academicYear: "2025-26",
  lateAfter: "09:15",
  cooldownSeconds: "45",
  halfDayHours: "4",
  lowAttendance: "75",
  campusName: "School of Computing",
  /** Minutes after the last schedule end before an open entry is auto-closed. */
  autoCloseGraceMinutes: "45",
  /** Reject a reader whose source IP is not in its allowlist. Off by default. */
  enforceDeviceIps: "false",
  /** Reject scans from readers not in the ACTIVE trust state. */
  requireTrustedDevices: "true",
  /** Refuse attendance for a student with a recent PROXY_ATTEMPT. Off by default. */
  blockAfterProxyAttempt: "true",
} as const;
export type SettingKey = keyof typeof DEFAULT_SETTINGS;
