import Link from "next/link";

const NAV = [
  { href: "/queue", label: "คิวโทรวันนี้" },
  { href: "/leads", label: "ผู้สนใจ" },
  { href: "/students", label: "ผู้เรียน" },
  { href: "/documents", label: "เอกสาร" },
  { href: "/faq", label: "คำถามที่พบบ่อย" },
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold leading-tight">ระบบผู้สนใจ–ผู้เรียน</p>
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
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
