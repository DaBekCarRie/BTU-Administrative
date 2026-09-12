"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CircleHelp,
  Database,
  FileText,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  PanelLeft,
  PhoneCall,
  Shield,
  Users,
  X,
} from "lucide-react";

export type AppShellStaff = {
  display_name: string;
  role: string;
};

export type AppShellBadgeCounts = {
  queue: number;
  documents: number;
};

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof PhoneCall;
  countKey?: keyof AppShellBadgeCounts;
};

const MAIN_NAV: NavItem[] = [
  { href: "/queue", label: "คิวโทรวันนี้", shortLabel: "คิวโทร", icon: PhoneCall, countKey: "queue" },
  { href: "/leads", label: "ผู้สนใจ", shortLabel: "ผู้สนใจ", icon: Users },
  { href: "/documents", label: "เอกสาร", shortLabel: "เอกสาร", icon: FileText, countKey: "documents" },
  { href: "/exams", label: "ศูนย์สอบพิเศษ", icon: MapPin },
  { href: "/faq", label: "คำถามที่พบบ่อย", icon: CircleHelp },
];

const SECONDARY_NAV = [
  { href: "/master-data", label: "ข้อมูลหลัก (คณะ/สาขา)", icon: Database },
  { href: "/access-log", label: "ร่องรอยการเข้าถึง", icon: Shield, adminOnly: true },
];

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "BT";
  return clean.slice(0, 2);
}

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/queue")) return { title: "คิวโทรวันนี้", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/leads")) return { title: "ผู้สนใจ", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/documents")) return { title: "เอกสาร", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/exams")) return { title: "ศูนย์สอบพิเศษ", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/faq")) return { title: "คำถามที่พบบ่อย", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/master-data")) return { title: "ข้อมูลหลัก (คณะ/สาขา)", subtitle: "ทีม LMS · มกธ." };
  if (pathname.startsWith("/access-log")) return { title: "ร่องรอยการเข้าถึง", subtitle: "ทีม LMS · มกธ." };
  return { title: "BTU Administrative", subtitle: "ทีม LMS · มกธ." };
}

export function AppShell({
  staff,
  badgeCounts,
  children,
}: {
  staff: AppShellStaff;
  badgeCounts: AppShellBadgeCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = getInitials(staff.display_name);
  const pageInfo = getPageTitle(pathname);

  const isNavActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-zinc-900 md:flex-row dark:bg-zinc-950 dark:text-zinc-100">
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside
        data-testid="sidebar"
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-zinc-200 bg-[#FCFCFD] transition-all duration-200 md:flex dark:border-zinc-800 dark:bg-zinc-900 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {/* Brand Header */}
        <div className="flex min-h-[56px] items-center gap-2.5 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F2A4A] text-[10.5px] font-semibold tracking-wide text-white">
            BTU
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                BTU Administrative
              </div>
              <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                ทีม LMS · มกธ.
              </div>
            </div>
          )}
          <button
            type="button"
            data-testid="toggle-sidebar"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label="ย่อ/ขยายเมนู"
            title="ย่อ/ขยายเมนู"
            aria-expanded={!collapsed}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-0.5 p-2" aria-label="เมนูหลัก">
          {MAIN_NAV.map((item) => {
            const active = isNavActive(item.href);
            const count = item.countKey ? badgeCounts[item.countKey] : 0;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-item-${item.href}`}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors ${
                  collapsed ? "justify-center px-0" : ""
                } ${
                  active
                    ? "bg-[#0F2A4A] font-medium text-white shadow-xs"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 my-1 h-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Secondary Navigation */}
        <nav className="flex flex-col gap-0.5 p-2" aria-label="เมนูเสริม">
          {SECONDARY_NAV.map((item) => {
            if (item.adminOnly && staff.role !== "admin") return null;
            const active = isNavActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-item-${item.href}`}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-7 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors ${
                  collapsed ? "justify-center px-0" : ""
                } ${
                  active
                    ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div className="mt-auto border-t border-zinc-200 p-2.5 dark:border-zinc-800">
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "mb-2.5"}`}>
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8EEF5] text-xs font-semibold text-[#0F2A4A]"
              title={staff.display_name}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div
                  data-testid="current-user"
                  className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {staff.display_name}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {staff.role === "admin" ? "หัวหน้าทีม" : "เจ้าหน้าที่"}
                </div>
              </div>
            )}
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="ออกจากระบบ"
              className={`flex h-7 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ${
                collapsed ? "px-0" : "px-2"
              }`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>ออกจากระบบ</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* ===================== MOBILE HEADER ===================== */}
      <header
        data-testid="mobile-header"
        className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-zinc-200 bg-white px-3 md:hidden dark:border-zinc-800 dark:bg-zinc-900"
      >
        <button
          type="button"
          data-testid="open-drawer"
          onClick={() => setDrawerOpen(true)}
          aria-label="เปิดเมนู"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {pageInfo.title}
          </div>
          <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {pageInfo.subtitle}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8EEF5] text-xs font-semibold text-[#0F2A4A]">
          {initials}
        </div>
      </header>

      {/* ===================== MOBILE DRAWER ===================== */}
      {drawerOpen && (
        <div
          data-testid="mobile-drawer"
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="เมนูหลัก"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex w-68 max-w-[80vw] flex-col border-r border-zinc-200 bg-[#FCFCFD] p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F2A4A] text-[10.5px] font-semibold text-white">
                  BTU
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    BTU Administrative
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    ทีม LMS · มกธ.
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="close-drawer"
                onClick={() => setDrawerOpen(false)}
                aria-label="ปิดเมนู"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Main Nav */}
            <nav className="flex flex-col gap-1 py-3" aria-label="เมนูหลักในแถบข้าง">
              {MAIN_NAV.map((item) => {
                const active = isNavActive(item.href);
                const count = item.countKey ? badgeCounts[item.countKey] : 0;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      active
                        ? "bg-[#0F2A4A] font-medium text-white"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />

            {/* Drawer Secondary Nav */}
            <nav className="flex flex-col gap-1 py-2" aria-label="เมนูเสริมในแถบข้าง">
              {SECONDARY_NAV.map((item) => {
                if (item.adminOnly && staff.role !== "admin") return null;
                const active = isNavActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs transition-colors ${
                      active
                        ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer User & Logout */}
            <div className="mt-auto border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8EEF5] text-xs font-semibold text-[#0F2A4A]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {staff.display_name}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {staff.role === "admin" ? "หัวหน้าทีม" : "เจ้าหน้าที่"}
                  </div>
                </div>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="min-w-0 flex-1 pb-18 md:pb-0">{children}</main>

      {/* ===================== MOBILE BOTTOM NAV ===================== */}
      <nav
        data-testid="mobile-bottom-nav"
        aria-label="เมนูลัดบนมือถือ"
        className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-4 border-t border-zinc-200 bg-white/95 px-1 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        {MAIN_NAV.slice(0, 3).map((item) => {
          const active = isNavActive(item.href);
          const count = item.countKey ? badgeCounts[item.countKey] : 0;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`mobile-bottom-${item.href}`}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] transition-colors ${
                active
                  ? "font-semibold text-[#0F2A4A] dark:text-blue-400"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[9.5px] font-bold text-white shadow-xs">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          type="button"
          data-testid="mobile-bottom-more"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10.5px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>เพิ่มเติม</span>
        </button>
      </nav>
    </div>
  );
}
