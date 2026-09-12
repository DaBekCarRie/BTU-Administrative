"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Download, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PersonListItem } from "@/lib/data/people";
import { formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { bulkChangeOwner } from "./actions";

type StaffOption = { id: string; display_name: string };

const HEADERS = [
  "ชื่อ",
  "ช่องทางติดต่อ",
  "หลักสูตร",
  "ภาค",
  "สถานะติดตาม",
  "ผู้ดูแล",
  "บันทึกล่าสุด",
  "การกระทำ",
] as const;

const STATUS_CHIPS = [
  "ทั้งหมด",
  "ใหม่",
  "กำลังติดตาม",
  "นัดโทรแล้ว",
  "สนใจสมัคร",
  "สมัครแล้ว",
  "ไม่สนใจ",
  "ติดต่อไม่ได้",
] as const;

function cell(value: string | null): string {
  const text = value ?? "";
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function LeadsView({
  items,
  staff,
  currentStatus = "",
}: {
  items: PersonListItem[];
  staff: StaffOption[];
  currentStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isChangingOwner, setIsChangingOwner] = useState(false);
  const [targetOwnerId, setTargetOwnerId] = useState("");
  const [isPending, startTransition] = useTransition();

  const allSelected =
    items.length > 0 && items.every((person) => selectedIds.includes(person.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  }

  function filterByStatusChip(status: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (status && status !== "ทั้งหมด") {
      next.set("status", status);
    } else {
      next.delete("status");
    }
    next.delete("page");
    router.push(`/leads?${next.toString()}`);
  }

  function exportSelected() {
    const selectedItems = items.filter((person) =>
      selectedIds.includes(person.id),
    );
    if (!selectedItems.length) return;

    const exportHeaders = [
      "ชื่อ",
      "เบอร์โทร",
      "ชื่อ Facebook",
      "คณะ",
      "สาขา",
      "ภาค",
      "สถานะติดตาม",
      "ผู้ดูแล",
      "บันทึกล่าสุด",
    ];

    const rows = selectedItems.map((person) =>
      [
        person.fullName,
        person.phone ? formatPhone(person.phone) : null,
        person.facebookName,
        person.facultyName,
        person.programName,
        person.studyMode,
        person.followUpStatus,
        person.ownerName,
        formatThaiDate(person.updatedAt),
      ]
        .map(cell)
        .join(","),
    );

    const csv = `\uFEFF${exportHeaders.map(cell).join(",")}\n${rows.join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `btu-leads-selected-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`ส่งออก ${selectedItems.length} รายการเรียบร้อยแล้ว`);
  }

  function handleConfirmChangeOwner() {
    if (!targetOwnerId) {
      toast.error("กรุณาเลือกผู้ดูแลใหม่");
      return;
    }

    startTransition(async () => {
      const res = await bulkChangeOwner(selectedIds, targetOwnerId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`เปลี่ยนผู้ดูแลสำเร็จ ${selectedIds.length} ราย`);
        setSelectedIds([]);
        setIsChangingOwner(false);
        setTargetOwnerId("");
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Mobile Horizontal Status Filter Chips */}
      <div className="md:hidden mb-3">
        <div
          data-testid="mobile-status-chips"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
        >
          {STATUS_CHIPS.map((status) => {
            const isActive =
              (currentStatus === "" && status === "ทั้งหมด") ||
              currentStatus === status;
            return (
              <button
                key={status}
                type="button"
                data-testid={`status-chip-${status}`}
                onClick={() => filterByStatusChip(status)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 font-medium shadow-xs"
                    : "bg-background text-muted-foreground border-slate-200 hover:border-slate-300 hover:text-foreground"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ไม่พบผู้สนใจที่ตรงกับเงื่อนไข</p>
          <p className="text-muted-foreground mt-1 text-sm">
            ลองล้างตัวกรอง หรือพิมพ์คำค้นให้สั้นลง
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-md border">

        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-2 text-center">
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  data-testid="select-all"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              {HEADERS.map((label) => (
                <th
                  key={label}
                  className={`text-muted-foreground px-3 py-2 text-left text-xs font-normal whitespace-nowrap ${
                    label === "การกระทำ"
                      ? "sticky right-0 bg-background shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] text-right"
                      : ""
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-testid="lead-rows">
            {items.map((person) => {
              const isSelected = selectedIds.includes(person.id);
              return (
                <tr
                  key={person.id}
                  className={`border-b last:border-b-0 transition-colors ${
                    isSelected
                      ? "bg-blue-50/50 dark:bg-blue-950/20"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <td className="w-10 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`เลือก ${person.fullName}`}
                      data-testid={`select-lead-${person.id}`}
                      checked={isSelected}
                      onChange={() => toggleSelect(person.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <Link
                      href={`/leads/${person.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums font-mono text-xs">
                    {person.phone ? (
                      <a
                        href={`tel:${person.phone}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatPhone(person.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-sans">
                        {person.facebookName ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {person.programName ??
                      person.facultyName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {person.studyMode ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {person.followUpStatus}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {person.ownerName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-2 whitespace-nowrap text-xs tabular-nums font-mono">
                    {formatThaiDate(person.updatedAt)}
                  </td>
                  <td className="sticky right-0 bg-background/95 backdrop-blur shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] px-3 py-2 whitespace-nowrap text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                    >
                      <Link
                        href={`/leads/${person.id}`}
                        data-testid={`open-lead-${person.id}`}
                      >
                        เปิดแฟ้ม <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5" data-testid="lead-mobile-cards">
        {items.map((person) => {
          const isSelected = selectedIds.includes(person.id);
          return (
            <div
              key={person.id}
              data-testid={`lead-card-${person.id}`}
              className={`rounded-xl border p-3.5 shadow-xs transition-colors ${
                isSelected
                  ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30"
                  : "border-border bg-card hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${person.fullName}`}
                    data-testid={`select-lead-mobile-${person.id}`}
                    checked={isSelected}
                    onChange={() => toggleSelect(person.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <Link
                      href={`/leads/${person.id}`}
                      className="font-semibold text-foreground hover:underline text-sm"
                    >
                      {person.fullName}
                    </Link>
                    <div className="text-xs text-muted-foreground tabular-nums font-mono mt-0.5">
                      {person.phone ? (
                        <a
                          href={`tel:${person.phone}`}
                          className="hover:underline"
                        >
                          {formatPhone(person.phone)}
                        </a>
                      ) : (
                        <span className="font-sans">
                          {person.facebookName ?? "—"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {person.followUpStatus}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="font-medium text-foreground">
                  {person.programName ?? person.facultyName ?? "—"}
                </span>
                {person.studyMode && (
                  <span className="text-xs text-muted-foreground">
                    ({person.studyMode})
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>ผู้ดูแล: {person.ownerName ?? "ไม่มี"}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 text-muted-foreground">
                <span className="tabular-nums font-mono text-[11px]">
                  {formatThaiDate(person.updatedAt)}
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium px-2"
                >
                  <Link href={`/leads/${person.id}`}>
                    เปิดแฟ้ม <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div
          data-testid="bulk-action-bar"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-800 text-sm animate-in fade-in slide-in-from-bottom-3 max-w-[95vw]"
        >
          <span
            className="font-medium text-slate-200 shrink-0 text-xs md:text-sm mr-1"
            data-testid="selected-count"
          >
            เลือกไว้ {selectedIds.length} ราย
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={exportSelected}
            className="h-7 text-xs gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
            data-testid="bulk-export-btn"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออกที่เลือก
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsChangingOwner(true)}
            className="h-7 text-xs gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
            data-testid="bulk-change-owner-btn"
          >
            <UserCheck className="w-3.5 h-3.5" />
            เปลี่ยนผู้ดูแล
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
            className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            data-testid="bulk-clear-btn"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            ยกเลิกการเลือก
          </Button>
        </div>
      )}

      {/* Dialog for Changing Owner */}
      <Dialog open={isChangingOwner} onOpenChange={setIsChangingOwner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เปลี่ยนผู้ดูแล</DialogTitle>
            <DialogDescription>
              เลือกผู้ดูแลใหม่สำหรับผู้สนใจ {selectedIds.length} รายที่เลือกไว้
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label
              htmlFor="bulk-owner-select"
              className="text-xs font-medium text-muted-foreground block mb-1.5"
            >
              ผู้ดูแลคนใหม่
            </label>
            <select
              id="bulk-owner-select"
              data-testid="bulk-staff-select"
              value={targetOwnerId}
              onChange={(e) => setTargetOwnerId(e.target.value)}
              className="w-full border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">-- เลือกเจ้าหน้าที่ --</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsChangingOwner(false)}
              disabled={isPending}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmChangeOwner}
              disabled={isPending || !targetOwnerId}
              data-testid="confirm-change-owner"
            >
              {isPending ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
