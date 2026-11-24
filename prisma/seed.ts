/* Demo seed. All people, employers, jobs and cohorts below are SYNTHETIC demo data, clearly labelled,
   and must be replaced by the owner before any real use. Catalogue rows come from the source workbook. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import catalogue from "../data/catalogue-1221.json";

const db = new PrismaClient();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const day = 86400_000;
const now = Date.now();

const VIDEOS = ["zOjov-2OZ0E", "rfscVS0vtbw", "UB1O30fR-EE", "yfoY53QXEnI", "hdI2bqOjy3c", "PkZNo7MFNFg"];
const FEATURED_FAMILY_HINTS = [
  "Computer & Digital Literacy", "AI, ML", "Data", "Web", "Digital Marketing", "Accounting", "Mithila", "Makhana",
  "Journalism", "Public Policy", "Teaching", "Health",
];

const ORIENTATION_QUESTIONS = [
  { text: "What must an internship certificate be based on?", options: ["Verified attendance, work and assessment evidence", "Payment alone", "A request from the student", "Social media followers"], correct: 0 },
  { text: "Under LNMU UG internship guidelines, the total internship duration for 4 credits is:", options: ["120 hours", "20 hours", "500 hours", "No minimum"], correct: 0 },
  { text: "A daily logbook entry should record:", options: ["Date, hours, tasks done and learning", "Only the date", "Only the mentor's name", "Nothing — it is optional"], correct: 0 },
  { text: "If you find an error in your attendance, you should:", options: ["Raise a support ticket with evidence for an audited correction", "Edit the database yourself", "Ask a friend to mark you present", "Ignore it"], correct: 0 },
  { text: "Plagiarism in your internship report:", options: ["Is not allowed; the report must be original with sources cited", "Is fine if the report is long", "Is required", "Is allowed after the viva"], correct: 0 },
  { text: "Your personal data on the platform may be used:", options: ["Only for the purposes you consented to, under the privacy policy", "Sold to advertisers", "Published publicly", "Shared with anyone who asks"], correct: 0 },
];

async function main() {
  console.log("Resetting demo data...");
  // order matters for FK
  const tables = [
    "verificationEvent", "credentialEvent", "credential", "signatory", "ticketMessage", "supportTicket", "jobApplication", "job", "employer",
    "liveQuestion", "liveAttendance", "liveSession", "watchProgress", "lesson", "module", "course", "submission", "assignment",
    "examAttempt", "question", "exam", "workLog", "refund", "payment", "order", "webhookEvent", "enrollment", "application", "cohort",
    "programme", "subjectFamily", "exceptionRequest", "auditEvent", "notification", "outboxMessage", "announcement", "aiRecommendation",
    "backupEvent", "setting", "consent", "passwordReset", "session", "rateLimit", "studentProfile", "user", "institution",
  ] as const;
  for (const t of tables) await (db[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();

  const inst = await db.institution.create({ data: { name: "Demo College, Darbhanga (synthetic)", code: "DEMO-COL-01", university: "LNMU (example mapping only)", district: "Darbhanga", verificationStatus: "UNVERIFIED" } });

  const pw = await bcrypt.hash("Demo@12345", 10);
  const mk = (email: string, name: string, role: string, extra: object = {}) => db.user.create({ data: { email, name, role, passwordHash: pw, ...extra } });
  const owner = await mk("owner@internverse.local", "Platform Owner (demo)", "ROOT_OWNER");
  await mk("admin@internverse.local", "Platform Admin (demo)", "PLATFORM_ADMIN");
  const academic = await mk("academic@internverse.local", "Academic Admin (demo)", "ACADEMIC_ADMIN");
  await mk("finance@internverse.local", "Finance Admin (demo)", "FINANCE_ADMIN");
  const certs = await mk("certs@internverse.local", "Certificate Officer (demo)", "CERTIFICATE_OFFICER");
  await mk("college@internverse.local", "College Coordinator (demo)", "COLLEGE_ADMIN", { institutionId: inst.id });
  await mk("support@internverse.local", "Support Agent (demo)", "SUPPORT_AGENT");
  await mk("auditor@internverse.local", "Auditor (demo)", "AUDITOR");
  const mentor = await mk("mentor@internverse.local", "Mentor Asha (demo)", "MENTOR");
  const mentor2 = await mk("mentor2@internverse.local", "Mentor Ravi (demo)", "MENTOR");
  await mk("employer@internverse.local", "Employer HR (demo)", "EMPLOYER");
  const student = await mk("student@internverse.local", "Priya Kumari (demo)", "STUDENT", {
    phone: "9000000001", institutionId: inst.id,
    profile: { create: { university: "LNMU", college: inst.name, degree: "BCA", semester: "4", session: "2024-27", rollNo: "DEMO-001", district: "Darbhanga", skills: "MS Office, HTML", interests: "Web development, data" } },
  });
  const student2 = await mk("student2@internverse.local", "Rahul Jha (demo)", "STUDENT", {
    phone: "9000000002", institutionId: inst.id,
    profile: { create: { university: "LNMU", college: inst.name, degree: "BCom", semester: "4", district: "Madhubani" } },
  });
  for (const u of [student, student2]) {
    await db.consent.createMany({ data: [{ userId: u.id, type: "TERMS", version: "1.0" }, { userId: u.id, type: "PRIVACY", version: "1.0" }] });
  }

  console.log("Importing 1221 catalogue programmes...");
  const families = [...new Set(catalogue.map((c) => c.family))];
  const famId = new Map<string, string>();
  for (const f of families) famId.set(f, (await db.subjectFamily.create({ data: { name: f } })).id);
  const featuredCodes = new Set<string>();
  for (const hint of FEATURED_FAMILY_HINTS) {
    const hit = catalogue.find((c) => c.family.toLowerCase().includes(hint.toLowerCase()) && !featuredCodes.has(c.code));
    if (hit) featuredCodes.add(hit.code);
  }
  const regional = /mithila|madhubani|makhana|fisher|dairy|agri|heritage|tourism|panchayat|bihar/i;
  await db.programme.createMany({
    data: catalogue.map((c) => ({
      code: c.code, title: c.title, familyId: famId.get(c.family)!, sourceStatus: c.sourceStatus, streams: c.streams, evidence: c.evidence,
      mode: c.mode, launchNote: c.launchNote,
      publicationStatus: featuredCodes.has(c.code) ? "PUBLISHED" : "CATALOGUE",
      isRegional: regional.test(`${c.family} ${c.title}`),
      durationHours: 120, feePaise: 49900,
      description: featuredCodes.has(c.code) ? `Supervised ${c.title} internship: guided learning, live mentor sessions, host-organisation work and a final report with viva. ${c.evidence}.` : null,
      outcomes: featuredCodes.has(c.code) ? `Practical ${c.title} skills\nDocumented work log and portfolio evidence\nInternship report prepared to the LNMU Annexure structure` : null,
    })),
  });
  const featured = await db.programme.findMany({ where: { publicationStatus: "PUBLISHED" }, orderBy: { code: "asc" } });

  console.log(`Building ${featured.length} launch-ready programmes...`);
  const cohorts = [];
  for (const [i, p] of featured.entries()) {
    const cohort = await db.cohort.create({
      data: { code: `${p.code}-C1`, programmeId: p.id, startDate: new Date(now - 20 * day), endDate: new Date(now + 40 * day), mode: "HYBRID", status: "OPEN", seats: 40, mentorId: i % 2 ? mentor2.id : mentor.id, hostName: "Demo Host Organisation (synthetic)" },
    });
    cohorts.push(cohort);
    const course = await db.course.create({ data: { programmeId: p.id, title: `${p.title} — Core Track`, description: "Orientation, fundamentals and applied project work." } });
    const titles = [["Orientation & professional readiness", "Internship rules, logbook and evidence"], ["Core concepts", "Applied project walkthrough"]];
    let n = 0;
    for (const [mi, pair] of titles.entries()) {
      const mod = await db.module.create({ data: { courseId: course.id, title: mi === 0 ? "Module 1 · Orientation" : "Module 2 · Applied skills", order: mi } });
      for (const [li, t] of pair.entries()) {
        await db.lesson.create({ data: { moduleId: mod.id, title: t, videoId: VIDEOS[(i + n) % VIDEOS.length], durationSec: 300, order: li, body: "Watch the lesson fully. Progress counts only real playback time — skipping ahead is not credited." } });
        n++;
      }
    }
    const exam = await db.exam.create({ data: { programmeId: p.id, title: "Final assessment — orientation & professional practice", kind: "FINAL", durationMin: 15, passPercent: 40, maxAttempts: 3, published: true } });
    for (const [qi, q] of ORIENTATION_QUESTIONS.entries()) {
      const opts = q.options.map((t: string, oi: number) => ({ id: `o${oi}`, text: t }));
      await db.question.create({ data: { examId: exam.id, text: q.text, options: JSON.stringify(opts), correctOptionId: `o${q.correct}`, marks: 1, order: qi } });
    }
    await db.assignment.createMany({
      data: [
        { cohortId: cohort.id, title: "Week 1 reflection", description: "Describe your host organisation, your role and three learning goals (300–500 words).", dueAt: new Date(now + 3 * day), maxMarks: 10 },
        { cohortId: cohort.id, title: "Mini project submission", description: "Submit a link to your project/portfolio artefact with a short explanation.", dueAt: new Date(now + 20 * day), maxMarks: 20 },
      ],
    });
    await db.liveSession.createMany({
      data: [
        { cohortId: cohort.id, title: "Kick-off & orientation", youtubeId: VIDEOS[0], startsAt: new Date(now - 7 * day), endsAt: new Date(now - 7 * day + 3600_000), mentorId: cohort.mentorId, status: "ENDED" },
        { cohortId: cohort.id, title: "Weekly mentor session (live now)", youtubeId: VIDEOS[1], startsAt: new Date(now - 15 * 60_000), endsAt: new Date(now + 6 * 3600_000), mentorId: cohort.mentorId, status: "LIVE" },
        { cohortId: cohort.id, title: "Project clinic", youtubeId: VIDEOS[2], startsAt: new Date(now + 3 * day), endsAt: new Date(now + 3 * day + 3600_000), mentorId: cohort.mentorId, status: "SCHEDULED" },
      ],
    });
  }

  // Student 1: enrolled + paid in first cohort, with some approved logs
  const c0 = cohorts[0];
  const app = await db.application.create({ data: { studentId: student.id, programmeId: c0.programmeId, cohortId: c0.id, status: "APPROVED", statement: "I want hands-on experience.", consentGiven: true, reviewedById: academic.id, decidedAt: new Date(now - 18 * day) } });
  const enr = await db.enrollment.create({ data: { studentId: student.id, cohortId: c0.id, applicationId: app.id, status: "ACTIVE", activatedAt: new Date(now - 17 * day) } });
  const order = await db.order.create({ data: { enrollmentId: enr.id, studentId: student.id, amountPaise: 49900, status: "PAID", provider: "SANDBOX", providerOrderId: "sandbox_order_seed1", receiptNo: `IVR-${new Date().getFullYear()}-000001`, idempotencyKey: "seed-order-1", paidAt: new Date(now - 17 * day) } });
  await db.payment.create({ data: { orderId: order.id, providerPaymentId: "sandbox_pay_seed1", status: "CAPTURED", amountPaise: 49900, method: "upi", source: "WEBHOOK" } });
  await db.setting.create({ data: { key: "receipt.seq", value: "1" } });
  const cats = ["TRAINING", "HOST", "HOST", "FIELD", "PROJECT", "HOST"];
  for (let d = 1; d <= 12; d++) {
    await db.workLog.create({ data: { userId: student.id, enrollmentId: enr.id, date: new Date(now - (16 - d) * day), minutes: 240, category: cats[d % cats.length], tasks: `Day ${d}: assigned tasks at host organisation`, learning: "Documented learning", status: d <= 9 ? "APPROVED" : "SUBMITTED", reviewerId: d <= 9 ? mentor.id : null } });
  }
  // Student 2: applied, pending review
  await db.application.create({ data: { studentId: student2.id, programmeId: cohorts[1].programmeId, cohortId: cohorts[1].id, status: "SUBMITTED", statement: "Interested in this field.", consentGiven: true } });

  const sig = await db.signatory.create({ data: { name: "Authorised Signatory (configure)", title: "Programme Director (placeholder)", authorityEvidence: null } });
  const issue = async (docType: string, title: string, status = "ISSUED") => {
    const code = `IV-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
    return db.credential.create({
      data: { code, token: randomBytes(16).toString("hex"), userId: student.id, recipientName: student.name, docType, theme: "01", title, programmeTitle: featured[0].title, programmeCode: featured[0].code, cohortCode: c0.code, hostName: c0.hostName, startDate: c0.startDate, endDate: c0.endDate, status, issuerName: "InternVerse", signatoryName: sig.name, signatoryTitle: sig.title, payloadHash: sha(code), issuedAt: new Date(now - 16 * day), createdById: certs.id },
    });
  };
  const offer = await issue("18", "Internship Offer / Allotment Letter");
  await issue("30", "Intern ID Card");
  for (const c of [offer]) await db.credentialEvent.create({ data: { credentialId: c.id, action: "ISSUED", actorId: certs.id } });

  const emp = await db.employer.create({ data: { name: "Demo Employer Pvt Ltd (synthetic)", verified: false, contact: "employer@internverse.local" } });
  await db.job.createMany({
    data: [
      { employerId: emp.id, title: "Junior Web Developer Trainee (demo listing)", location: "Darbhanga", mode: "Hybrid", stipend: "Demo — not a real vacancy", description: "Synthetic sample listing used to demonstrate the jobs workflow.", skills: "HTML, CSS, JavaScript", status: "OPEN", closesAt: new Date(now + 30 * day) },
      { employerId: emp.id, title: "Data Entry & MIS Assistant (demo listing)", location: "Remote", mode: "Online", stipend: "Demo — not a real vacancy", description: "Synthetic sample listing.", skills: "Excel, Tally", status: "OPEN", closesAt: new Date(now + 20 * day) },
    ],
  });

  await db.supportTicket.create({ data: { userId: student.id, name: student.name, email: student.email, category: "TECHNICAL", subject: "Video buffering on mobile", messages: { create: [{ authorId: student.id, authorName: student.name, body: "The lesson video stops on 2G network." }] } } });
  await db.announcement.create({ data: { title: "Welcome to the demo platform", titleHi: "डेमो प्लेटफ़ॉर्म में आपका स्वागत है", body: "All people, employers and cohorts shown are synthetic demo data.", published: true } });
  await db.aiRecommendation.create({ data: { kind: "AT_RISK", targetType: "User", targetId: student2.id, summary: "Application pending > 3 days — suggest review (rule-based signal, requires human decision)." } });
  await db.auditEvent.create({ data: { actorId: owner.id, actorRole: "ROOT_OWNER", action: "SEED", targetType: "System", newValue: "Demo seed loaded" } });
  console.log("Seed complete. Demo password for all accounts: Demo@12345");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
