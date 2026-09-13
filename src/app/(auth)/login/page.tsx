import { redirect } from "next/navigation";

import { currentStaffId } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ส่งต่อเฉพาะเจ้าหน้าที่ที่ยังใช้งานอยู่ — ถ้าเช็คแค่ว่ามี session คนที่ล็อกอินได้แต่ไม่ใช่เจ้าหน้าที่
  // จะวนระหว่างหน้านี้กับ layout ที่ส่งกลับมาไม่รู้จบ และไม่เคยเห็นข้อความว่ายังไม่มีสิทธิ์
  if (user && (await currentStaffId())) redirect("/queue");

  const { next, error } = await searchParams;
  // ถึงบรรทัดนี้ได้แปลว่าไม่ใช่เจ้าหน้าที่ — ถ้ายังมี session ก็คือล็อกอินได้แต่ไม่มีสิทธิ์
  const signedInWithoutAccess = !!user;
  const urlError = typeof error === "string" ? error : signedInWithoutAccess ? "no-staff" : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 p-6">
      <div>
        <h1 className="text-xl font-semibold">ระบบผู้สนใจ–ผู้เรียน</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ทีม LMS มหาวิทยาลัยกรุงเทพธนบุรี
        </p>
      </div>
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        urlError={urlError}
      />
      {signedInWithoutAccess ? (
        <form action="/auth/signout" method="post" data-testid="no-access">
          <p className="text-muted-foreground mb-2 text-sm">
            ล็อกอินอยู่ในชื่อ {user.email} · ใช้บัญชีอื่นได้โดยออกจากระบบก่อน
          </p>
          <button type="submit" className="text-primary text-sm underline-offset-4 hover:underline">
            ออกจากระบบ
          </button>
        </form>
      ) : null}
    </div>
  );
}
