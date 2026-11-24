"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, rateLimit, verifyPassword, getUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueue } from "@/lib/outbox";
import { randomToken, sha256 } from "@/lib/crypto";
import { isStaff } from "@/lib/rbac";

const ip = () => headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
};

export async function login(fd: FormData) {
  const email = String(fd.get("email") || "").toLowerCase().trim();
  const password = String(fd.get("password") || "");
  const next = safeNext(fd.get("next"));
  const back = (e: string) => redirect(`/login?error=${encodeURIComponent(e)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  if (!(await rateLimit(`login:${ip()}`, 20, 900)) || !(await rateLimit(`login:${email}`, 8, 900))) back("Too many attempts. Please wait 15 minutes.");
  const user = await db.user.findUnique({ where: { email } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) back("Account temporarily locked. Try later or reset your password.");
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60_000) : null } });
      await audit({ actorId: user.id, action: "LOGIN_FAILED", targetType: "User", targetId: user.id, result: "FAILED" });
    }
    back("Invalid email or password.");
  }
  if (user!.status !== "ACTIVE") back("This account is not active. Contact support.");
  await db.user.update({ where: { id: user!.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession(user!.id);
  await audit({ actorId: user!.id, actorRole: user!.role, action: "LOGIN", targetType: "User", targetId: user!.id });
  const role = user!.role;
  redirect(next || (role === "STUDENT" ? "/dashboard" : ["MENTOR", "HOST_SUPERVISOR", "FACULTY_COORDINATOR"].includes(role) ? "/mentor" : role === "EMPLOYER" ? "/employer" : isStaff(role) ? "/admin" : "/"));
}

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8).max(100).regex(/[A-Za-z]/).regex(/\d/),
  college: z.string().trim().max(200).optional(),
  degree: z.string().trim().max(100).optional(),
  semester: z.string().trim().max(20).optional(),
  district: z.string().trim().max(100).optional(),
  isMinor: z.boolean(),
  guardianName: z.string().trim().max(100).optional(),
});

export async function register(fd: FormData) {
  if (!(await rateLimit(`register:${ip()}`, 10, 3600))) redirect("/register?error=Too+many+registrations+from+this+network");
  const parsed = RegisterSchema.safeParse({
    name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), password: fd.get("password"),
    college: fd.get("college") || undefined, degree: fd.get("degree") || undefined, semester: fd.get("semester") || undefined,
    district: fd.get("district") || undefined, isMinor: fd.get("isMinor") === "on", guardianName: fd.get("guardianName") || undefined,
  });
  if (!parsed.success) redirect(`/register?error=${encodeURIComponent(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))}`);
  if (fd.get("terms") !== "on" || fd.get("privacy") !== "on") redirect("/register?error=Please+accept+the+terms+and+privacy+policy");
  const d = parsed.data;
  if (d.isMinor && (!d.guardianName || fd.get("guardianConsent") !== "on")) redirect("/register?error=Guardian+name+and+consent+are+required+for+students+under+18");
  if (await db.user.findUnique({ where: { email: d.email } })) redirect("/register?error=An+account+with+this+email+already+exists");
  const user = await db.user.create({
    data: {
      name: d.name, email: d.email, phone: d.phone, passwordHash: await hashPassword(d.password), role: "STUDENT",
      profile: { create: { college: d.college, degree: d.degree, semester: d.semester, district: d.district, isMinor: d.isMinor, guardianName: d.guardianName } },
      consents: { create: [{ type: "TERMS", version: "1.0" }, { type: "PRIVACY", version: "1.0" }, ...(d.isMinor ? [{ type: "GUARDIAN", version: "1.0" }] : []), ...(fd.get("marketing") === "on" ? [{ type: "MARKETING", version: "1.0" }] : [])] },
    },
  });
  await audit({ actorId: user.id, actorRole: "STUDENT", action: "REGISTER", targetType: "User", targetId: user.id, studentId: user.id });
  await enqueue({ to: user.email, subject: "Welcome to InternVerse", body: `Hi ${user.name}, your account is ready.`, key: `welcome:${user.id}` });
  await createSession(user.id);
  redirect("/dashboard?ok=Welcome!+Your+account+is+ready.");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestReset(fd: FormData) {
  const email = String(fd.get("email") || "").toLowerCase().trim();
  if (await rateLimit(`reset:${ip()}`, 5, 3600)) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = randomToken(32);
      await db.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
      const url = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
      await enqueue({ to: user.email, subject: "Reset your password", body: `Reset link (valid 30 minutes): ${url}`, priority: 0, key: `reset:${sha256(token)}` });
    }
  }
  // Same response whether or not the account exists (no account enumeration).
  redirect("/forgot-password?ok=If+an+account+exists,+a+reset+link+has+been+queued.+(In+demo+mode+see+Admin+→+Outbox.)");
}

export async function resetPassword(fd: FormData) {
  const token = String(fd.get("token") || "");
  const pw = String(fd.get("password") || "");
  if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) redirect(`/reset-password?token=${token}&error=Password+must+be+8%2B+chars+with+letters+and+numbers`);
  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) redirect("/forgot-password?error=Reset+link+is+invalid+or+expired");
  await db.$transaction([
    db.user.update({ where: { id: row!.userId }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } }),
    db.passwordReset.update({ where: { id: row!.id }, data: { usedAt: new Date() } }),
    db.session.updateMany({ where: { userId: row!.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ actorId: row!.userId, action: "PASSWORD_RESET", targetType: "User", targetId: row!.userId });
  redirect("/login?ok=Password+updated.+Please+log+in.");
}

export async function changePassword(fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/login");
  const cur = String(fd.get("current") || ""), pw = String(fd.get("password") || "");
  const back = fd.get("back") === "/admin/account" ? "/admin/account" : "/dashboard/profile";
  if (!(await verifyPassword(cur, u.passwordHash))) redirect(`${back}?error=Current+password+is+incorrect`);
  if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) redirect(`${back}?error=Password+must+be+8%2B+chars+with+letters+and+numbers`);
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw) } });
  await audit({ actorId: u.id, actorRole: u.role, action: "PASSWORD_CHANGE", targetType: "User", targetId: u.id });
  redirect(`${back}?ok=Password+changed`);
}
