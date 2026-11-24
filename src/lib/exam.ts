import { seededRandom, shuffle } from "./crypto";

export interface QuestionRow { id: string; text: string; options: string; correctOptionId: string; marks: number }
export interface PublicQuestion { id: string; text: string; marks: number; options: { id: string; text: string }[] }

/** Deterministic per-attempt order; correctOptionId is stripped and never reaches the client. */
export function buildPaper(questions: QuestionRow[], seed: string): PublicQuestion[] {
  const rand = seededRandom(seed);
  return shuffle(questions, rand).map((q) => ({
    id: q.id,
    text: q.text,
    marks: q.marks,
    options: shuffle(JSON.parse(q.options) as { id: string; text: string }[], rand),
  }));
}

export function grade(questions: QuestionRow[], answers: Record<string, string>, passPercent: number) {
  let score = 0, max = 0;
  for (const q of questions) {
    max += q.marks;
    if (answers[q.id] && answers[q.id] === q.correctOptionId) score += q.marks;
  }
  const percent = max ? Math.round((score / max) * 100) : 0;
  return { score, maxScore: max, percent, passed: percent >= passPercent };
}

/** Sanitises an answer map to only known question/option ids. */
export function sanitizeAnswers(questions: QuestionRow[], raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const q of questions) {
    const v = (raw as Record<string, unknown>)[q.id];
    if (typeof v === "string" && (JSON.parse(q.options) as { id: string }[]).some((o) => o.id === v)) out[q.id] = v;
  }
  return out;
}
