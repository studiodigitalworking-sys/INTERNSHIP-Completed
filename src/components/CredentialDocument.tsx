import QRCode from "qrcode";
import { themeById, docById } from "@/lib/credential";
import { fmtDate } from "@/lib/format";

interface Cred {
  code: string; token: string; recipientName: string; docType: string; theme: string; title: string; programmeTitle: string | null; programmeCode: string | null;
  cohortCode: string | null; hostName: string | null; verifiedHours: number | null; startDate: Date | null; endDate: Date | null; issuedAt: Date | null;
  issuerName: string; signatoryName: string | null; signatoryTitle: string | null; status: string; fields: string | null; version: number;
}

function bodyText(c: Cred) {
  const prog = c.programmeTitle ? <strong>{c.programmeTitle}</strong> : "the programme";
  const period = c.startDate ? <> from <strong>{fmtDate(c.startDate)}</strong> to <strong>{fmtDate(c.endDate)}</strong></> : null;
  const hours = c.verifiedHours != null ? <>, with <strong>{c.verifiedHours} verified hours</strong></> : null;
  const kind = docById(c.docType)?.kind;
  switch (c.docType) {
    case "01": case "05": return <>has successfully completed the internship in {prog}{period}{hours}{c.hostName ? <> at <strong>{c.hostName}</strong></> : null}, meeting the recorded attendance, work and assessment requirements.</>;
    case "02": return <>has participated in the internship programme {prog}{period}.</>;
    case "03": return <>has completed the training/learning modules of {prog}{period}.</>;
    case "04": return <>has attended the live sessions of {prog}{period}{hours}, as per platform attendance records.</>;
    case "06": return <>has completed the project work under {prog}{period}.</>;
    case "07": return <>is recognised for merit and excellence in {prog}.</>;
    case "08": return <>has demonstrated competency in the skills assessed under {prog}.</>;
    case "09": case "10": return <>is appreciated for outstanding contribution{c.programmeTitle ? <> in {prog}</> : null}.</>;
    case "18": return <>is offered an internship in {prog}{c.cohortCode ? <> (cohort {c.cohortCode})</> : null}{period}{c.hostName ? <>, with host organisation <strong>{c.hostName}</strong></> : null}. Please confirm acceptance through your dashboard.</>;
    case "19": return <>has joined and been onboarded to {prog}{period}.</>;
    case "30": return <>Intern · {c.programmeTitle ?? ""} · Cohort {c.cohortCode ?? "—"} · Valid till {fmtDate(c.endDate)}</>;
    default: return <>This {kind?.toLowerCase() ?? "document"} pertains to <strong>{c.recipientName}</strong>{c.programmeTitle ? <> for {prog}</> : null}{period}. Details are recorded in the InternVerse registry.</>;
  }
}

export async function CredentialDocument({ c, appUrl }: { c: Cred; appUrl: string }) {
  const t = themeById(c.theme);
  const verifyUrl = `${appUrl}/verify/${c.token}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180, color: { dark: t.primary } });
  const extra = c.fields ? (JSON.parse(c.fields) as Record<string, string>) : {};
  const card = c.docType === "30";
  return (
    <div className={`relative mx-auto bg-white shadow-lg print:shadow-none ${card ? "aspect-[1.6/1] max-w-md" : "aspect-[1.414/1] max-w-4xl"}`} style={{ background: t.paper, color: "#1f2937" }}>
      <div className="absolute inset-3 border-4" style={{ borderColor: t.primary }} />
      <div className="absolute inset-5 border" style={{ borderColor: t.accent }} />
      {(c.status === "REVOKED" || c.status === "SUPERSEDED") && <div className="pointer-events-none absolute inset-0 grid place-items-center text-6xl font-black uppercase opacity-20" style={{ color: "#b91c1c", transform: "rotate(-20deg)" }}>{c.status}</div>}
      <div className={`relative flex h-full flex-col items-center text-center ${card ? "p-8 text-sm" : "p-12 sm:p-16"}`}>
        <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: t.accent }}>{c.issuerName}</div>
        <h2 className={`${card ? "mt-2 text-xl" : "mt-4 text-3xl sm:text-4xl"} font-serif font-bold`} style={{ color: t.primary }}>{c.title}</h2>
        {!card && <div className="mt-6 text-sm uppercase tracking-widest text-slate-500">This is to certify that</div>}
        <div className={`${card ? "mt-2 text-lg" : "mt-2 text-2xl sm:text-3xl"} font-serif font-semibold`} style={{ color: t.primary }}>{c.recipientName}</div>
        <p className={`mx-auto mt-4 max-w-2xl ${card ? "text-xs" : "text-sm sm:text-base"} leading-relaxed`}>{bodyText(c)}</p>
        {Object.keys(extra).length > 0 && <div className="mt-2 text-xs text-slate-600">{Object.entries(extra).map(([k, v]) => <span key={k} className="mr-3">{k}: {v}</span>)}</div>}
        <div className="mt-auto flex w-full items-end justify-between gap-4 text-left text-xs">
          <div><div>Credential ID: <strong>{c.code}</strong>{c.version > 1 ? ` (v${c.version})` : ""}</div><div>Issued: {fmtDate(c.issuedAt)}</div><div className="text-slate-500">Verify: {appUrl.replace(/^https?:\/\//, "")}/verify</div></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code to verify credential ${c.code}`} className={card ? "h-16 w-16" : "h-24 w-24"} />
          <div className="text-right">{c.signatoryName ? <><div className="mb-1 h-8 border-b" style={{ borderColor: t.primary }} /><div className="font-semibold">{c.signatoryName}</div><div className="text-slate-500">{c.signatoryTitle}</div></> : <div className="text-slate-400">Signatory not configured</div>}</div>
        </div>
      </div>
    </div>
  );
}
