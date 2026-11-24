import { db } from "./db";
import { credentialCode, credentialToken, sha256 } from "./crypto";
import { audit } from "./audit";
import { notify } from "./outbox";
import { COMPLETION_DOC_TYPES } from "./constants";
import docsThemes from "../../data/documents-themes.json";

export const DOCS = docsThemes.docs as { id: string; title: string; kind: string; desc: string }[];
export const THEMES = docsThemes.themes as { id: string; name: string; primary: string; accent: string; paper: string; desc: string }[];
export const docById = (id: string) => DOCS.find((d) => d.id === id);
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[1];

export interface EligibilityCheck { rule: string; passed: boolean; detail: string }

/** Evidence-based completion eligibility (no false 120-hour claims). */
export async function completionEligibility(userId: string, enrollmentId: string) {
  const s = await (await import("./settings")).getSettings();
  const enr = await db.enrollment.findUnique({ where: { id: enrollmentId }, include: { cohort: { include: { programme: true } } } });
  if (!enr || enr.studentId !== userId) return { eligible: false, checks: [{ rule: "Enrollment", passed: false, detail: "Not found" }], verifiedHours: 0 };
  const logs = await db.workLog.findMany({ where: { enrollmentId, status: "APPROVED" } });
  const approvedMin = logs.reduce((a, l) => a + l.minutes, 0);
  const hostMin = logs.filter((l) => ["HOST", "FIELD", "PROJECT"].includes(l.category)).reduce((a, l) => a + l.minutes, 0);
  const totalReq = Number(s["rules.totalHours"]) * 60;
  const hostReq = Number(s["rules.minHostHours"]) * 60;
  const exams = await db.exam.findMany({ where: { programmeId: enr.cohort.programmeId, published: true, kind: "FINAL" }, select: { id: true } });
  const passed = exams.length ? await db.examAttempt.count({ where: { userId, examId: { in: exams.map((e) => e.id) }, passed: true } }) : 0;
  const assignments = await db.assignment.findMany({ where: { cohortId: enr.cohortId }, select: { id: true } });
  const reviewed = await db.submission.findMany({ where: { userId, assignmentId: { in: assignments.map((a) => a.id) }, status: "REVIEWED" }, distinct: ["assignmentId"] });
  const checks: EligibilityCheck[] = [
    { rule: "Enrollment active (payment verified)", passed: ["ACTIVE", "COMPLETED"].includes(enr.status), detail: enr.status },
    { rule: `Approved total hours ≥ ${s["rules.totalHours"]}`, passed: approvedMin >= totalReq, detail: `${(approvedMin / 60).toFixed(1)} h approved` },
    { rule: `Host/field/project hours ≥ ${s["rules.minHostHours"]}`, passed: hostMin >= hostReq, detail: `${(hostMin / 60).toFixed(1)} h` },
    { rule: "Final exam passed", passed: exams.length === 0 || passed > 0, detail: exams.length ? (passed ? "Passed" : "Not passed") : "No final exam configured" },
    { rule: "All assignments reviewed", passed: reviewed.length >= assignments.length, detail: `${reviewed.length}/${assignments.length}` },
  ];
  return { eligible: checks.every((c) => c.passed), checks, verifiedHours: Math.floor(approvedMin / 60), enrollment: enr };
}

export interface IssueInput {
  actor: { id: string; role: string };
  userId?: string | null;
  recipientName: string;
  docType: string;
  theme: string;
  programmeTitle?: string | null;
  programmeCode?: string | null;
  cohortCode?: string | null;
  hostName?: string | null;
  verifiedHours?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  fields?: Record<string, string>;
  isException?: boolean;
  exceptionReason?: string | null;
  evidenceRef?: string | null;
  approvedById?: string | null;
  supersedesId?: string | null;
  idempotencyKey?: string | null;
}

export async function issueCredential(input: IssueInput) {
  const doc = docById(input.docType);
  if (!doc) throw new Error("Unknown document type");
  if (COMPLETION_DOC_TYPES.includes(input.docType) && input.isException && (!input.exceptionReason || !input.approvedById)) {
    throw new Error("Completion exception requires reason and an approved exception");
  }
  if (input.idempotencyKey) {
    const existing = await db.credential.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
  }
  const s = await (await import("./settings")).getSettings();
  const sig = await db.signatory.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = credentialCode();
    const token = credentialToken();
    const payload = {
      code, docType: input.docType, title: doc.title, recipientName: input.recipientName, programmeTitle: input.programmeTitle,
      cohortCode: input.cohortCode, verifiedHours: input.verifiedHours, startDate: input.startDate, endDate: input.endDate, issuer: s["org.legalName"] || s["org.name"],
    };
    try {
      return await db.$transaction(async (tx) => {
        let version = 1;
        if (input.supersedesId) {
          const prev = await tx.credential.findUnique({ where: { id: input.supersedesId } });
          if (!prev) throw new Error("Previous credential not found");
          if (prev.status === "REVOKED") throw new Error("Revoked credentials cannot be reissued; issue a new authorised credential instead");
          version = prev.version + 1;
          await tx.credential.update({ where: { id: prev.id }, data: { status: "SUPERSEDED" } });
          await tx.credentialEvent.create({ data: { credentialId: prev.id, action: "SUPERSEDED", actorId: input.actor.id, reason: input.exceptionReason ?? "Reissued" } });
        }
        const c = await tx.credential.create({
          data: {
            code, token, userId: input.userId ?? null, recipientName: input.recipientName, docType: input.docType, theme: input.theme,
            title: doc.title, programmeTitle: input.programmeTitle, programmeCode: input.programmeCode, cohortCode: input.cohortCode,
            hostName: input.hostName, verifiedHours: input.verifiedHours ?? null, startDate: input.startDate ?? null, endDate: input.endDate ?? null,
            fields: JSON.stringify(input.fields ?? {}), status: input.supersedesId ? "CORRECTED" : "ISSUED", version,
            supersedesId: input.supersedesId ?? null, issuerName: s["org.legalName"] || s["org.name"], signatoryName: sig?.name, signatoryTitle: sig?.title,
            isException: !!input.isException, exceptionReason: input.exceptionReason, evidenceRef: input.evidenceRef,
            payloadHash: sha256(JSON.stringify(payload)), issuedAt: new Date(), createdById: input.actor.id, approvedById: input.approvedById,
            idempotencyKey: input.idempotencyKey ?? null,
          },
        });
        await tx.credentialEvent.create({ data: { credentialId: c.id, action: input.supersedesId ? "REISSUED" : "ISSUED", actorId: input.actor.id, reason: input.exceptionReason } });
        await audit({ actorId: input.actor.id, actorRole: input.actor.role, action: input.supersedesId ? "CREDENTIAL_REISSUE" : "CREDENTIAL_ISSUE", targetType: "Credential", targetId: c.id, studentId: input.userId, newValue: { code, docType: input.docType, isException: input.isException }, reason: input.exceptionReason, evidenceRef: input.evidenceRef, approvalId: input.approvedById }, tx);
        if (input.userId) await notify(input.userId, "New document issued", `${doc.title} (${code}) is available.`, "/dashboard/certificates", tx);
        return c;
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Unique constraint") && attempt < 4) continue; // ID collision retry
      throw e;
    }
  }
  throw new Error("Could not allocate credential id");
}

export async function revokeCredential(id: string, actor: { id: string; role: string }, reason: string) {
  if (!reason.trim()) throw new Error("Reason required");
  return db.$transaction(async (tx) => {
    const c = await tx.credential.findUniqueOrThrow({ where: { id } });
    if (c.status === "REVOKED") return c;
    const u = await tx.credential.update({ where: { id }, data: { status: "REVOKED", revokedReason: reason } });
    await tx.credentialEvent.create({ data: { credentialId: id, action: "REVOKED", actorId: actor.id, reason } });
    await audit({ actorId: actor.id, actorRole: actor.role, action: "CREDENTIAL_REVOKE", targetType: "Credential", targetId: id, studentId: c.userId, oldValue: c.status, newValue: "REVOKED", reason }, tx);
    return u;
  });
}

export function publicStatus(status: string) {
  switch (status) {
    case "ISSUED": return { label: "Valid", tone: "green" };
    case "CORRECTED": return { label: "Valid (corrected version)", tone: "green" };
    case "SUPERSEDED": return { label: "Superseded — replaced by a newer version", tone: "amber" };
    case "REVOKED": return { label: "Revoked", tone: "red" };
    default: return { label: "Not valid (pending)", tone: "amber" };
  }
}
