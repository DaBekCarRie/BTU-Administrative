import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // scope local เท่านั้น — ตั้งต้นของ Supabase คือ global ซึ่งจะเตะผู้ใช้คนเดียวกัน
  // ออกจากทุกเครื่อง เจ้าหน้าที่ที่ล็อกอินทั้งมือถือและคอมจะหลุดพร้อมกันโดยไม่ได้ตั้งใจ
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
