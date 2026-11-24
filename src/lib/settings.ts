import { db } from "./db";

export const DEFAULT_SETTINGS = {
  "org.name": "InternVerse",
  "org.legalName": "",
  "org.address": "",
  "org.email": "",
  "org.phone": "",
  "org.registration": "",
  "org.gstin": "",
  "issuer.verified": "false",
  "fee.defaultPaise": "49900",
  "fee.collegeBulkPaise": "29900",
  "rules.totalHours": "120",
  "rules.minHostHours": "90",
  "rules.lessonUnlockPercent": "90",
  "rules.attendancePresentPercent": "75",
  "rules.attendancePartialPercent": "25",
  "rules.examPassPercent": "40",
  "rules.reportWeight": "70",
  "rules.vivaWeight": "30",
  "payments.mode": "TEST",
  "youtube.channel": "",
  "flags.maintenance": "false",
  "flags.registrations": "true",
  "flags.jobs": "true",
  "flags.aiAssistant": "true",
  "receipt.seq": "0",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await db.setting.findMany();
  const out = { ...DEFAULT_SETTINGS } as Record<SettingKey, string>;
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}
export async function getSetting(key: SettingKey) {
  const r = await db.setting.findUnique({ where: { key } });
  return r?.value ?? DEFAULT_SETTINGS[key];
}
export async function getNumber(key: SettingKey) {
  return Number(await getSetting(key));
}
