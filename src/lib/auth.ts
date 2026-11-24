import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { can, isStaff, type Permission } from "./rbac";

export const SESSION_COOKIE = "iv_session";
const SESSION_DAYS = 7;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, userAgent: headers().get("user-agent")?.slice(0, 200) },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: (process.env.APP_URL ?? "").startsWith("https:"), path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: sha256(token) }, data: { revokedAt: new Date() } });
  cookies().delete(SESSION_COOKIE);
}

/** Authoritative session check against the DB on every request (no stale cache). */
export async function getUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s || s.revokedAt || s.expiresAt < new Date() || s.user.status !== "ACTIVE") return null;
  return s.user;
}
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export async function requireUser(next = "/dashboard") {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}
export async function requireStudent() {
  const u = await requireUser();
  if (u.role !== "STUDENT") redirect(isStaff(u.role) ? "/admin" : "/");
  return u;
}
export async function requireStaff() {
  const u = await requireUser("/admin");
  if (!isStaff(u.role)) redirect("/dashboard");
  return u;
}
export async function requirePermission(perm: Permission) {
  const u = await requireUser("/admin");
  if (!can(u.role, perm)) redirect(`/forbidden?p=${encodeURIComponent(perm)}`);
  return u;
}

/** Fixed-window rate limiter stored in DB. */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || now.getTime() - row.windowStart.getTime() > windowSec * 1000) {
    await db.rateLimit.upsert({ where: { key }, create: { key, count: 1, windowStart: now }, update: { count: 1, windowStart: now } });
    return true;
  }
  if (row.count >= max) return false;
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}
