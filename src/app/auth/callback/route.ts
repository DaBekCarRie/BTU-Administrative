import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/url";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // ตรวจสอบว่าผู้ใช้มีสิทธิ์เจ้าหน้าที่ในระบบและเปิดใช้งานอยู่หรือไม่
      const { data: staff } = await supabase
        .from("staff")
        .select("id, is_active")
        .eq("auth_user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!staff) {
        // ยังไม่ได้ผูกสิทธิ์เจ้าหน้าที่ หรือถูกปิดใช้งาน — ออกจากระบบทันทีเพื่อไม่ให้ค้าง session
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(`${origin}/login?error=no-staff`);
      }

      return NextResponse.redirect(`${origin}${safeRedirectPath(next)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
