import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/queue", label: "คิวโทรวันนี้" },
  { href: "/leads", label: "ผู้สนใจ" },
  { href: "/students", label: "ผู้เรียน" },
  { href: "/documents", label: "เอกสาร" },
  { href: "/faq", label: "คำถามที่พบบ่อย" },
] as const;

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
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) redirect("/login?error=no-staff");

  return (
    <div className="flex min-h-full">
      <aside className="bg-sidebar hidden w-56 shrink-0 flex-col border-r md:flex">
        <div className="border-b px-4 py-4">
          <p className="text-sm leading-tight font-semibold">
            ระบบผู้สนใจ–ผู้เรียน
          </p>
          <p className="text-muted-foreground text-xs">ทีม LMS · BTU</p>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t p-3">
          <p className="truncate text-sm font-medium" data-testid="current-user">
            {staff.display_name}
          </p>
          <p className="text-muted-foreground mb-2 text-xs">
            {staff.role === "admin" ? "หัวหน้าทีม" : "เจ้าหน้าที่"}
          </p>
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full"
            >
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
