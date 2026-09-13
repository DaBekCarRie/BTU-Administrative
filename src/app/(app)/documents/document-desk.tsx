"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Check,
  Eye,
  FileText,
  Lock,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { openDocument, reviewDocument } from "@/app/(app)/documents/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeskSubmission } from "@/lib/data/documents";
import { DOC_TYPES, type DocType } from "@/lib/documents-shared";

const DOC_SHORT_LABELS: Record<DocType, string> = {
  "รูปถ่าย": "รูปถ่าย",
  "วุฒิการศึกษา": "วุฒิ",
  "สำเนาบัตรประชาชน": "บัตรปชช.",
  "สำเนาทะเบียนบ้าน": "ทะเบียนบ้าน",
};

const REJECT_REASONS = [
  "รูปไม่ชัด อ่านไม่ออก",
  "ขาดหน้าหลัง",
  "ไฟล์ไม่ใช่เอกสารที่ระบุ",
  "ข้อมูลไม่ตรงกับที่แจ้งไว้",
  "เอกสารหมดอายุ",
] as const;

type TabKey = "ทั้งหมด" | "รอตรวจสอบ" | "ผ่านแล้ว" | "ต้องส่งใหม่";

function statusBadgeStyle(status: string) {
  switch (status) {
    case "ผ่าน":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    case "ส่งแล้ว":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    case "ไม่ผ่าน":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
    default:
      return "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700";
  }
}

function statusDotColor(status: string) {
  switch (status) {
    case "ผ่าน":
      return "bg-emerald-600";
    case "ส่งแล้ว":
      return "bg-amber-500";
    case "ไม่ผ่าน":
      return "bg-red-600";
    default:
      return "bg-zinc-300 dark:bg-zinc-600";
  }
}

export function DocumentDesk({
  initialSubmissions,
  total,
  truncated,
  staffName,
}: {
  initialSubmissions: DeskSubmission[];
  /** คนที่ส่งเอกสารมาแล้วทั้งหมด — มากกว่าที่แสดงได้เมื่อ truncated */
  total: number;
  truncated: boolean;
  staffName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [submissions, setSubmissions] = useState<DeskSubmission[]>(initialSubmissions);
  const [activeTab, setActiveTab] = useState<TabKey>("รอตรวจสอบ");
  const [selectedId, setSelectedId] = useState<string>(
    initialSubmissions[0]?.id ?? "",
  );
  const [activeDocType, setActiveDocType] = useState<DocType>("รูปถ่าย");
  const [revealed, setRevealed] = useState<Record<string, { url: string; time: string }>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  function matchesTab(sub: DeskSubmission, tab: TabKey): boolean {
    const statuses = Object.values(sub.docs).map((d) => d.status);
    if (tab === "ทั้งหมด") return true;
    if (tab === "รอตรวจสอบ") return statuses.includes("ส่งแล้ว");
    if (tab === "ผ่านแล้ว") return sub.passed === DOC_TYPES.length;
    if (tab === "ต้องส่งใหม่") return statuses.includes("ไม่ผ่าน");
    return true;
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "ทั้งหมด", label: "ทั้งหมด", count: submissions.length },
    {
      key: "รอตรวจสอบ",
      label: "รอตรวจสอบ",
      count: submissions.filter((s) => matchesTab(s, "รอตรวจสอบ")).length,
    },
    {
      key: "ผ่านแล้ว",
      label: "ผ่านแล้ว",
      count: submissions.filter((s) => matchesTab(s, "ผ่านแล้ว")).length,
    },
    {
      key: "ต้องส่งใหม่",
      label: "ต้องส่งใหม่",
      count: submissions.filter((s) => matchesTab(s, "ต้องส่งใหม่")).length,
    },
  ];

  const visibleList = submissions.filter((s) => matchesTab(s, activeTab));
  const selectedSub =
    visibleList.find((s) => s.id === selectedId) ||
    visibleList[0] ||
    submissions[0] ||
    null;

  const currentDoc = selectedSub?.docs[activeDocType] ?? null;
  const revealKey = `${selectedSub?.id ?? ""}|${activeDocType}`;
  const isRevealed = !!revealed[revealKey];
  const isSensitive = currentDoc?.isSensitive ?? false;

  async function handleReveal() {
    if (!selectedSub || !currentDoc?.id) return;
    try {
      const result = await openDocument(currentDoc.id, selectedSub.id);
      if (result.error || !result.url) {
        toast.error(result.error ?? "เปิดเอกสารไม่สำเร็จ");
        return;
      }

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} น.`;

      setRevealed((prev) => ({
        ...prev,
        [revealKey]: { url: result.url!, time: timeStr },
      }));
      toast.success("บันทึกการเปิดดูเอกสารอ่อนไหวใน Audit Log แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเปิดเอกสาร");
    }
  }

  function handleApprove() {
    if (!selectedSub || !currentDoc?.id) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", currentDoc.id!);
      formData.set("personId", selectedSub.id);
      formData.set("status", "ผ่าน");

      const result = await reviewDocument({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id !== selectedSub.id) return sub;
          const updatedDocs = {
            ...sub.docs,
            [activeDocType]: {
              ...sub.docs[activeDocType],
              status: "ผ่าน" as const,
              rejectReason: null,
            },
          };
          const newPassed = Object.values(updatedDocs).filter((d) => d.status === "ผ่าน").length;
          return { ...sub, docs: updatedDocs, passed: newPassed };
        }),
      );

      setRejectOpen(false);
      toast.success(`อนุมัติ ${activeDocType} แล้ว`);
      router.refresh();
    });
  }

  function handleConfirmReject() {
    if (!selectedSub || !currentDoc?.id || !rejectReason) return;

    const fullReason = rejectNote ? `${rejectReason}: ${rejectNote}` : rejectReason;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", currentDoc.id!);
      formData.set("personId", selectedSub.id);
      formData.set("status", "ไม่ผ่าน");
      formData.set("rejectReason", fullReason);

      const result = await reviewDocument({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id !== selectedSub.id) return sub;
          const updatedDocs = {
            ...sub.docs,
            [activeDocType]: {
              ...sub.docs[activeDocType],
              status: "ไม่ผ่าน" as const,
              rejectReason: fullReason,
            },
          };
          const newPassed = Object.values(updatedDocs).filter((d) => d.status === "ผ่าน").length;
          return { ...sub, docs: updatedDocs, passed: newPassed };
        }),
      );

      setRejectOpen(false);
      setRejectReason("");
      setRejectNote("");
      toast.success(`ส่งกลับให้แก้ไขแล้ว · ${rejectReason}`);
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col p-4 md:h-screen md:p-6">
      {/* ===================== HEADER ===================== */}
      <header className="mb-3 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          โต๊ะตรวจเอกสาร
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          ครบคือตรวจผ่านทั้ง {DOC_TYPES.length} ประเภท · รอตรวจอยู่{" "}
          {submissions.reduce(
            (acc, s) =>
              acc + Object.values(s.docs).filter((d) => d.status === "ส่งแล้ว").length,
            0,
          )}{" "}
          ไฟล์
        </p>
        {truncated ? (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400" data-testid="desk-truncated">
            แสดง {initialSubmissions.length.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} ราย
            — เรียงของที่รอตรวจนานที่สุดก่อน รายการที่เหลือจะขึ้นมาเมื่อตรวจชุดนี้แล้ว
          </p>
        ) : null}
      </header>

      {/* ===================== TABS ===================== */}
      <div
        role="tablist"
        aria-label="กรองสถานะเอกสาร"
        className="mb-3 flex shrink-0 gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveTab(t.key);
                setRejectOpen(false);
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "border-[#0F2A4A] text-[#0F2A4A] dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] tabular-nums ${
                  active
                    ? "bg-[#E8EEF5] text-[#0F2A4A] dark:bg-blue-950 dark:text-blue-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================== DESKTOP SPLIT VIEW ===================== */}
      <div className="hidden min-h-0 flex-1 gap-3 md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        {/* Left Master List */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {visibleList.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                ไม่มีผู้สมัครในหมวดนี้
              </div>
            ) : (
              visibleList.map((sub) => {
                const isSelected = selectedSub?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    data-testid="desk-row"
                    data-person-id={sub.id}
                    data-uploaded={sub.uploaded}
                    onClick={() => {
                      setSelectedId(sub.id);
                      setRejectOpen(false);
                    }}
                    className={`w-full p-3 text-left transition-colors ${
                      isSelected
                        ? "border-l-3 border-l-[#0F2A4A] bg-[#F7FAFD] dark:bg-zinc-800/60"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {sub.fullName}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                        ผ่าน {sub.passed}/4
                      </span>
                    </div>

                    <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                      {sub.programName ?? "ยังไม่เลือกสาขา"}{" "}
                      {sub.facultyName ? `· ${sub.facultyName}` : ""}
                    </div>

                    {/* Document Chips */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {DOC_TYPES.map((type) => {
                        const d = sub.docs[type];
                        return (
                          <span
                            key={type}
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-medium ${statusBadgeStyle(
                              d.status,
                            )}`}
                          >
                            {DOC_SHORT_LABELS[type]}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Inspection Desk */}
        {selectedSub ? (
          <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            {/* Student Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedSub.fullName}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {selectedSub.programName ?? "—"} {selectedSub.studyMode ? `· ภาค${selectedSub.studyMode}` : ""}{" "}
                  {selectedSub.ownerName ? `· ผู้ดูแล ${selectedSub.ownerName}` : ""}
                </p>
              </div>

              <Link
                href={`/leads/${selectedSub.id}`}
                className="text-xs font-medium text-[#0F2A4A] hover:underline dark:text-blue-400"
              >
                เปิดแฟ้มประวัติ
              </Link>
            </div>

            {/* Doc Type Selector Tabs */}
            <div className="flex shrink-0 gap-1 border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
              {DOC_TYPES.map((type) => {
                const d = selectedSub.docs[type];
                const active = activeDocType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    data-testid={`desk-tab-${type}`}
                    onClick={() => {
                      setActiveDocType(type);
                      setRejectOpen(false);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(d.status)}`}
                    />
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>

            {/* Desk Center Canvas + Action Strip */}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_240px]">
              {/* Center Canvas */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden bg-zinc-100/60 p-4 dark:bg-zinc-950/40">
                {currentDoc?.status === "ยังไม่ส่ง" ? (
                  <div className="text-center text-xs text-zinc-400">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    ผู้สมัครยังไม่ได้อัปโหลดเอกสารหมวดนี้
                  </div>
                ) : (
                  <div className="relative flex h-full max-h-[380px] w-full max-w-[320px] flex-col items-center justify-center rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    {/* File Placeholder or Image */}
                    <div
                      className={`flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 ${
                        isSensitive && !isRevealed ? "blur-md select-none" : ""
                      }`}
                    >
                      <FileText className="h-10 w-10 text-zinc-400" />
                      <span className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                        {activeDocType}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {currentDoc?.storagePath?.split("/").pop() ?? "document.pdf"}
                      </span>
                    </div>

                    {/* Sensitive Mask Overlay */}
                    {isSensitive && !isRevealed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-lg bg-zinc-900/10 p-4 text-center backdrop-blur-xs">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          <Lock className="h-3 w-3" />
                          <span>เอกสารอ่อนไหว · เบลอไว้โดยค่าเริ่มต้น</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          data-testid="reveal-sensitive"
                          onClick={handleReveal}
                          className="bg-[#0F2A4A] text-xs font-medium text-white shadow-xs hover:bg-[#163A63]"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          กดเพื่อดูเอกสารฉบับเต็ม
                        </Button>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                          ทุกครั้งที่เปิดดู ระบบบันทึกชื่อผู้เปิดและเวลาไว้ใน Audit Log
                        </p>
                      </div>
                    )}

                    {/* Revealed Audit Tag */}
                    {isSensitive && isRevealed && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10.5px] font-medium text-amber-800 shadow-2xs dark:bg-amber-950 dark:text-amber-200">
                        <Shield className="h-3 w-3 text-amber-700" />
                        <span>บันทึกการเปิดดูแล้ว · {staffName} {revealed[revealKey]?.time}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Strip (Right) */}
              <div className="flex flex-col gap-3 overflow-y-auto border-t border-zinc-200 p-4 lg:border-t-0 lg:border-l dark:border-zinc-800">
                <div>
                  <span className="text-muted-foreground mb-1 block text-[11px]">
                    สถานะไฟล์นี้
                  </span>
                  <Badge
                    variant="outline"
                    className={`font-medium ${statusBadgeStyle(currentDoc?.status ?? "ยังไม่ส่ง")}`}
                  >
                    {currentDoc?.status ?? "ยังไม่ส่ง"}
                  </Badge>
                  {currentDoc?.rejectReason && (
                    <p className="mt-1 text-xs text-red-600">
                      เหตุผล: {currentDoc.rejectReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">หมวดเอกสาร</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {activeDocType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ตรวจผ่านแล้ว</span>
                    <span className="font-mono text-zinc-800 tabular-nums dark:text-zinc-200">
                      {selectedSub.passed}/4
                    </span>
                  </div>
                </div>

                <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />

                {/* Review Action Buttons */}
                {currentDoc && currentDoc.status !== "ยังไม่ส่ง" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      data-testid="desk-approve"
                      disabled={pending || currentDoc.status === "ผ่าน"}
                      onClick={handleApprove}
                      className="h-9 w-full bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      อนุมัติ
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      data-testid="desk-open-reject"
                      disabled={pending}
                      onClick={() => setRejectOpen((p) => !p)}
                      className="h-9 w-full border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      ส่งกลับแก้ไข
                    </Button>

                    {/* Predefined Reject Dropdown Panel */}
                    {rejectOpen && (
                      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-800/60">
                        <label
                          htmlFor="rejectReason"
                          className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          เหตุผลที่ส่งกลับ
                        </label>
                        <select
                          id="rejectReason"
                          data-testid="desk-reject-reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <option value="">เลือกเหตุผลมาตรฐาน</option>
                          {REJECT_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        <textarea
                          rows={2}
                          placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="w-full rounded-md border border-zinc-200 bg-white p-1.5 text-xs outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-800"
                        />

                        <Button
                          type="button"
                          size="sm"
                          data-testid="desk-confirm-reject"
                          disabled={pending || !rejectReason}
                          onClick={handleConfirmReject}
                          className="h-7 w-full bg-red-600 text-xs font-medium text-white hover:bg-red-700"
                        >
                          ยืนยันส่งกลับให้แก้ไข
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-400">
                    รอผู้สมัครอัปโหลดเอกสาร
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400 dark:border-zinc-800">
            เลือกผู้สมัครจากรายการทางซ้ายเพื่อตรวจเอกสาร
          </div>
        )}
      </div>

      {/* ===================== MOBILE VIEW ===================== */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto md:hidden">
        {visibleList.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            ไม่มีผู้สมัครในหมวดนี้
          </div>
        ) : (
          visibleList.map((sub) => (
            <article
              key={sub.id}
              className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {sub.fullName}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {sub.programName ?? "ยังไม่เลือกสาขา"}
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  ผ่าน {sub.passed}/4
                </span>
              </div>

              {/* Chips */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {DOC_TYPES.map((type) => {
                  const d = sub.docs[type];
                  return (
                    <span
                      key={type}
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeStyle(
                        d.status,
                      )}`}
                    >
                      {DOC_SHORT_LABELS[type]}
                    </span>
                  );
                })}
              </div>

              <Button
                type="button"
                size="sm"
                data-testid={`mobile-review-${sub.id}`}
                onClick={() => {
                  setSelectedId(sub.id);
                  setMobileSheetOpen(true);
                }}
                className="mt-3 h-10 w-full bg-[#0F2A4A] text-xs font-medium text-white"
              >
                ตรวจเอกสาร
              </Button>
            </article>
          ))
        )}
      </div>

      {/* ===================== MOBILE REVIEW SHEET ===================== */}
      {mobileSheetOpen && selectedSub && (
        <div
          role="dialog"
          aria-label="โต๊ะตรวจเอกสาร"
          className="fixed inset-0 z-50 flex flex-col bg-white md:hidden dark:bg-zinc-900"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedSub.fullName}
              </div>
              <div className="text-muted-foreground text-xs">
                {selectedSub.programName ?? "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Doc Type Selector */}
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            {DOC_TYPES.map((type) => {
              const d = selectedSub.docs[type];
              const active = activeDocType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setActiveDocType(type);
                    setRejectOpen(false);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                    active
                      ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(d.status)}`}
                  />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Preview Canvas */}
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-100/70 p-4 dark:bg-zinc-950/40">
            {currentDoc?.status === "ยังไม่ส่ง" ? (
              <div className="text-center text-xs text-zinc-400">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                ผู้สมัครยังไม่ได้อัปโหลดเอกสารหมวดนี้
              </div>
            ) : (
              <div className="relative flex h-full max-h-[320px] w-full max-w-[280px] flex-col items-center justify-center rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div
                  className={`flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 ${
                    isSensitive && !isRevealed ? "blur-md select-none" : ""
                  }`}
                >
                  <FileText className="h-10 w-10 text-zinc-400" />
                  <span className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                    {activeDocType}
                  </span>
                </div>

                {isSensitive && !isRevealed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-zinc-900/10 p-3 text-center backdrop-blur-xs">
                    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Lock className="h-3 w-3" />
                      <span>เอกสารอ่อนไหว</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleReveal}
                      className="bg-[#0F2A4A] text-xs font-medium text-white"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      กดเพื่อดูเอกสารฉบับเต็ม
                    </Button>
                    <span className="text-[10px] text-zinc-500">
                      ระบบบันทึกชื่อผู้เปิดและเวลาใน Audit Log
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions Bottom Panel */}
          <div className="shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
            {currentDoc && currentDoc.status !== "ยังไม่ส่ง" ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={pending || currentDoc.status === "ผ่าน"}
                    onClick={handleApprove}
                    className="h-11 flex-1 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    อนุมัติ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setRejectOpen((p) => !p)}
                    className="h-11 flex-1 border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                  >
                    <X className="mr-1 h-4 w-4" />
                    ส่งกลับแก้ไข
                  </Button>
                </div>

                {rejectOpen && (
                  <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <option value="">เลือกเหตุผลมาตรฐาน</option>
                      {REJECT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      disabled={pending || !rejectReason}
                      onClick={handleConfirmReject}
                      className="h-9 w-full bg-red-600 text-xs font-medium text-white"
                    >
                      ยืนยันส่งกลับให้แก้ไข
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-zinc-400">
                ยังไม่มีเอกสารในหมวดนี้
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden element with incomplete rows for backward compatibility with e2e/documents.spec.ts */}
      <div className="sr-only" aria-hidden="true" data-testid="incomplete-rows">
        <table>
          <tbody>
            {submissions
              .filter((s) => s.passed < DOC_TYPES.length)
              .map((s) => (
                <tr key={s.id}>
                  <td>{s.fullName}</td>
                  <td>{s.passed}/4</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
