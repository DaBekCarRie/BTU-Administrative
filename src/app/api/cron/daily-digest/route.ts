import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";

/**
 * สรุปงานประจำวันส่งเข้ากลุ่ม LINE — ตั้งเวลาด้วย Vercel Cron
 * ยังไม่ได้พัฒนา: รอตาราง leads และ pipeline ก่อน
 */
export async function GET(request: NextRequest) {
  const { cronSecret } = serverEnv();

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, note: "ยังไม่ได้พัฒนา" });
}
