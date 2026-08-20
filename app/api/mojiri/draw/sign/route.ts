import { NextResponse } from "next/server";
import { encodePayload, signPayload, validatePayload, type MojiriDrawPayload } from "../../../../../lib/mojiri-draw";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Omit<MojiriDrawPayload, "version" | "drawnAt">;
    const payload: MojiriDrawPayload = { ...body, version: 1, drawnAt: new Date().toISOString() };
    if (!validatePayload(payload)) return NextResponse.json({ error: "완료된 추첨 결과가 올바르지 않습니다." }, { status: 400 });
    const data = encodePayload(payload); const signature = signPayload(data);
    return NextResponse.json({ payload, resultUrl: `/mojiri/draw/result?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "추첨 결과에 서명하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
