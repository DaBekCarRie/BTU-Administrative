import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/queue");

  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 p-6">
      <div>
        <h1 className="text-xl font-semibold">ระบบผู้สนใจ–ผู้เรียน</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ทีม LMS มหาวิทยาลัยกรุงเทพธนบุรี
        </p>
      </div>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
