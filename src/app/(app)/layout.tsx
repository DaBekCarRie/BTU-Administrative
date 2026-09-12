import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCallQueue } from "@/lib/data/call-queue";
import { getWorkBoard } from "@/lib/data/work-board";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ล็อกอินได้แต่ไม่มีแถวใน staff (หรือถูกปิดใช้งาน) = ยังไม่ใช่เจ้าหน้าที่ของทีม
  const { data: staff } = await supabase
    .from("staff")
    .select("display_name, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) redirect("/login?error=no-staff");

  // ดึงตัวเลขงานค้างสำหรับแสดง Badge ในเมนูนำทาง
  const [queueResult, boardResult] = await Promise.all([
    getCallQueue().catch(() => ({ total: 0 })),
    getWorkBoard().catch(() => ({ incompleteDocuments: 0 })),
  ]);

  const badgeCounts = {
    queue: queueResult?.total ?? 0,
    documents: boardResult?.incompleteDocuments ?? 0,
  };

  return (
    <AppShell
      staff={{ display_name: staff.display_name, role: staff.role }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AppShell>
  );
}
