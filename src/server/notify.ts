import { and, eq, gte, ilike } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";

export async function notifyUser(userId: number, title: string, message: string, type = "info") {
  await db.insert(notifications).values({ userId, title, message, type, read: false });
}

export async function notifyAdmins(title: string, message: string, type = "warning") {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
  if (!admins.length) return;
  await db.insert(notifications).values(admins.map((admin) => ({ userId: admin.id, title, message, type, read: false })));
}

export async function notifyAdminsOnce(title: string, message: string, type = "warning", windowMs = 12 * 60 * 60 * 1000) {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.title, title), ilike(notifications.message, message), gte(notifications.createdAt, new Date(Date.now() - windowMs))))
    .limit(1);
  if (existing) return;
  await notifyAdmins(title, message, type);
}
