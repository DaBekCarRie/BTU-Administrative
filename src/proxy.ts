import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 เรียกชั้นนี้ว่า proxy (เดิมชื่อ middleware)
 * หน้าที่: รีเฟรช session ของ Supabase และกันเส้นทางที่ต้องล็อกอิน
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // ทุกเส้นทาง ยกเว้นไฟล์สแตติกและรูปภาพ
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
