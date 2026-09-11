import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * ใช้ใน Server Component, Server Action และ Route Handler
 * สวมสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ → RLS ทำงานตามปกติ
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // เรียกจาก Server Component ที่เขียนคุกกี้ไม่ได้ — middleware จัดการรีเฟรชให้แล้ว
        }
      },
    },
  });
}
