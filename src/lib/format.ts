export const TZ = "Asia/Kolkata";

export function rupees(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
}
export function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}
export function fmtDateTime(d?: Date | string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}
export function hours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}
export function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return e;
  return `${u.slice(0, 2)}***@${d}`;
}
export function maskPhone(p?: string | null) {
  if (!p) return "—";
  return p.length > 4 ? `******${p.slice(-4)}` : "****";
}
export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // CSV formula-injection guard
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
