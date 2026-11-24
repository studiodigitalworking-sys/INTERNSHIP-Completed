import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const secret = () => process.env.APP_SECRET || "dev-only-insecure-secret";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
export function hmac(key: string, input: string) {
  return createHmac("sha256", key).update(input).digest("hex");
}
export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function crockford(len: number) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CROCKFORD[bytes[i] & 31];
  return out;
}

/** Human-readable credential code: IV-{YEAR}-{10 Crockford base32 chars} (50 bits, CSPRNG). */
export function credentialCode(year = new Date().getFullYear()) {
  return `IV-${year}-${crockford(10)}`;
}
/** 128-bit opaque token used in QR URLs — the real security factor. */
export function credentialToken() {
  return randomBytes(16).toString("hex");
}

/** Deterministic PRNG seeded by HMAC(secret, seed) — used for stable exam shuffles. */
export function seededRandom(seed: string) {
  let counter = 0;
  let buf = Buffer.alloc(0);
  let pos = 0;
  return () => {
    if (pos + 4 > buf.length) {
      buf = createHmac("sha256", secret()).update(`${seed}:${counter++}`).digest();
      pos = 0;
    }
    const v = buf.readUInt32BE(pos);
    pos += 4;
    return v / 0x100000000;
  };
}
export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
