import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const MOJIRI_MEMBERS = ["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"] as const;
export const DRAW_SLOTS = ["A1", "B1", "C1", "A2", "B2", "C2", "D1"] as const;
export type DrawSlot = typeof DRAW_SLOTS[number];
export type MojiriDrawPayload = {
  version: 1;
  drawId: string;
  title: string;
  tournamentMonth: string;
  drawnAt: string;
  participants: string[];
  slots: Record<DrawSlot, string>;
};

const secret = () => {
  const value = process.env.MOJIRI_DRAW_SECRET;
  if (value?.length && value.length >= 32) return value;
  if (value) throw new Error("MOJIRI_DRAW_SECRET는 32자 이상이어야 합니다.");
  if (process.env.NODE_ENV !== "production") return "dcu-mojiri-local-development-only";
  throw new Error("MOJIRI_DRAW_SECRET가 설정되지 않았습니다.");
};

export const encodePayload = (payload: MojiriDrawPayload) => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
export const decodePayload = (encoded: string) => JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MojiriDrawPayload;
export const signPayload = (encoded: string) => createHmac("sha256", secret()).update(encoded).digest("base64url");

export function validatePayload(value: unknown): value is MojiriDrawPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<MojiriDrawPayload>;
  if (payload.version !== 1 || typeof payload.drawId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.drawId)) return false;
  if (typeof payload.title !== "string" || payload.title.length < 2 || payload.title.length > 40 || !/^\d{4}-\d{2}$/.test(payload.tournamentMonth || "")) return false;
  if (!payload.drawnAt || Number.isNaN(Date.parse(payload.drawnAt))) return false;
  if (!Array.isArray(payload.participants) || payload.participants.length !== 7 || new Set(payload.participants).size !== 7) return false;
  if (payload.participants.some((name) => !MOJIRI_MEMBERS.includes(name as typeof MOJIRI_MEMBERS[number]))) return false;
  if (!payload.slots || typeof payload.slots !== "object") return false;
  const assigned = DRAW_SLOTS.map((slot) => payload.slots?.[slot]);
  return assigned.every((name) => typeof name === "string") && new Set(assigned).size === 7 && assigned.every((name) => payload.participants?.includes(name as string));
}

export function verifySignedPayload(encoded: string, signature: string) {
  try {
    const expected = Buffer.from(signPayload(encoded)); const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { verified: false as const, payload: null };
    const payload = decodePayload(encoded);
    if (!validatePayload(payload)) return { verified: false as const, payload: null };
    return { verified: true as const, payload };
  } catch {
    return { verified: false as const, payload: null };
  }
}
