"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/url";

export type LoginState = { error?: string };

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next") as string | null;

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // redirect โยน error พิเศษของ Next — ต้องอยู่นอก try/catch เสมอ
  redirect(safeRedirectPath(next));
}

export async function signInWithGoogle(formData: FormData): Promise<never> {
  const next = formData.get("next") as string | null;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const origin =
    headerList.get("origin") ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

  const supabase = await createClient();
  const target = safeRedirectPath(next);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(target)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}
