import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";

/**
 * สรุปงานประจำวันส่งเข้ากลุ่ม LINE — ตั้งเวลาด้วย Vercel Cron
 * ยังไม่ได้พัฒนา: รอตาราง leads และ pipeline ก่อน
 */
export async function GET(request: NextRequest) {
  const { cronSecret } = serverEnv();

  // ไม่ได้ตั้ง secret = ปิดไว้ก่อน ไม่ใช่เปิดให้ทุกคน — วันที่ route นี้เริ่มสรุปข้อมูลจริง
  // ถ้ายังเปิดอยู่ ข้อมูลจะหลุดทันทีโดยไม่มีใครสังเกต
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, note: "ยังไม่ได้พัฒนา" });
}
