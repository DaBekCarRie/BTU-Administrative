"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Phone,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { logCall } from "@/app/(app)/leads/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "@/lib/data/call-queue";
import type { WorkBoard } from "@/lib/data/work-board";
import { daysOverdue, formatThaiDate, toDateInputValue } from "@/lib/date";
import { CALL_OUTCOMES, type CallOutcome } from "@/lib/domain/events";
import { formatPhone } from "@/lib/phone";

const QUICK_DAYS = [
  { label: "พรุ่งนี้", days: 1 },
  { label: "3 วัน", days: 3 },
  { label: "1 สัปดาห์", days: 7 },
] as const;

const CLOSING_OUTCOMES: ReadonlySet<CallOutcome> = new Set([
  "คุยแล้วไม่สนใจ",
  "สมัครแล้ว",
]);

type LoggedState = {
  outcome: CallOutcome;
  nextDate?: string;
  note?: string;
  closing: boolean;
};

export function QueueView({
  initialQueue,
  board,
  staffList,
  facultyList,
}: {
  initialQueue: {
    overdue: QueueItem[];
    today: QueueItem[];
    total: number;
    truncated: boolean;
  };
  board: WorkBoard;
  staffList: { id: string; name: string }[];
  facultyList: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [logged, setLogged] = useState<Record<string, LoggedState>>({});
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form draft state
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [nextDate, setNextDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [showTiles, setShowTiles] = useState(true);

  function openPopover(id: string) {
    if (openRowId === id) {
      setOpenRowId(null);
      return;
    }
    const existing = logged[id];
    setOpenRowId(id);
    setSheetOpen(false);
    setOutcome(existing ? existing.outcome : null);
    setNextDate(existing?.nextDate ?? "");
    setNote(existing?.note ?? "");
    setError(null);
  }

  function openSheet(id: string) {
    const existing = logged[id];
    setOpenRowId(id);
    setSheetOpen(true);
    setOutcome(existing ? existing.outcome : null);
    setNextDate(existing?.nextDate ?? "");
    setNote(existing?.note ?? "");
    setError(null);
  }

  function closeLogger() {
    setOpenRowId(null);
    setSheetOpen(false);
    setOutcome(null);
    setNextDate("");
    setNote("");
    setError(null);
  }

  function submitCallForm(personId: string) {
    if (!outcome) return;
    setError(null);

    const formData = new FormData();
    formData.set("personId", personId);
    formData.set("outcome", outcome);
    formData.set("nextCallAt", nextDate);
    formData.set("occurredAt", toDateInputValue());
    if (note) formData.set("note", note);

    const isClosing = CLOSING_OUTCOMES.has(outcome);

    startTransition(async () => {
      const result = await logCall({}, formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setLogged((prev) => ({
        ...prev,
        [personId]: {
          outcome,
          nextDate: isClosing ? undefined : nextDate,
          note,
          closing: isClosing,
        },
      }));

      closeLogger();
      toast.success(`บันทึกผลโทรแล้ว · ${outcome}`);
      router.refresh();
    });
  }

  // Filter items
  function matchesFilter(item: QueueItem) {
    if (ownerFilter && item.ownerName !== ownerFilter) return false;
    if (facultyFilter && item.facultyName !== facultyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().replace(/-/g, "").toLowerCase();
      const nameMatch = item.fullName.toLowerCase().includes(q);
      const phoneMatch = item.phone?.replace(/-/g, "").includes(q) ?? false;
      const fbMatch = item.facebookName?.toLowerCase().includes(q) ?? false;
      if (!nameMatch && !phoneMatch && !fbMatch) return false;
    }
    return true;
  }

  const overdueList = initialQueue.overdue.filter(matchesFilter);
  const todayList = initialQueue.today.filter(matchesFilter);
  const totalShown = overdueList.length + todayList.length;
  const isFiltered = !!(searchQuery || ownerFilter || facultyFilter);

  const loggedCount = Object.keys(logged).length;
  const remainingToday = Math.max(0, initialQueue.total - loggedCount);
  const completedToday = loggedCount;

  const activePerson =
    [...initialQueue.overdue, ...initialQueue.today].find(
      (x) => x.id === openRowId,
    ) ?? null;

  return (
    <div className="p-4 md:p-6">
      {/* ===================== HEADER ===================== */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            คิวโทรวันนี้
          </h1>
          <p
            className="text-muted-foreground mt-0.5 text-xs md:text-sm"
            data-testid="queue-summary"
          >
            ต้องโทร {initialQueue.total.toLocaleString("th-TH")} คน
            {initialQueue.truncated ? ` (แสดง ${initialQueue.overdue.length + initialQueue.today.length} รายแรก)` : ""}
            {initialQueue.overdue.length > 0 ? ` · เลยกำหนด ${initialQueue.overdue.length}` : ""}
          </p>
        </div>

        {/* Real-time Summary Strip */}
        <div
          data-testid="totals-strip"
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[11px]">ค้างโทร</span>
            <span className="font-mono font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {remainingToday}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[11px]">โทรแล้ว</span>
            <span className="font-mono font-semibold text-emerald-600 tabular-nums">
              {completedToday}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-baseline gap-1.5 text-[11px] text-muted-foreground">
            <span>
              เดือนนี้สมัคร{" "}
              <strong className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {board.appliedThisMonth.toLocaleString("th-TH")}
              </strong>
            </span>
            <span>·</span>
            <span>
              เรียนอยู่{" "}
              <strong className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {board.enrolled.toLocaleString("th-TH")}
              </strong>
            </span>
            <span>·</span>
            <span>
              ดรอป{" "}
              <strong className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {board.dropped.toLocaleString("th-TH")}
              </strong>
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
          <button
            type="button"
            onClick={() => setShowTiles((p) => !p)}
            className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-4 hover:underline"
          >
            {showTiles ? "ซ่อนกระดานงาน" : "ดูกระดานงาน"}
          </button>
        </div>
      </header>

      {/* ===================== WORKBOARD TILES ===================== */}
      {showTiles && (
        <section
          className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          data-testid="work-board"
        >
          <Link
            href="/leads?status=กำลังติดตาม"
            data-testid="tile-ไม่มีใครแตะ"
            className="hover:bg-accent flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">ไม่มีใครแตะ</span>
              <span
                className={`font-mono text-base font-semibold tabular-nums md:text-lg ${
                  board.staleLeads > 0 ? "text-red-600" : ""
                }`}
              >
                {board.staleLeads}
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">เกิน 7 วัน</span>
          </Link>

          <Link
            href="/leads?status=สมัครแล้ว"
            data-testid="tile-รอรหัสนักศึกษา"
            className="hover:bg-accent flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">รอรหัสนักศึกษา</span>
              <span
                className={`font-mono text-base font-semibold tabular-nums md:text-lg ${
                  board.awaitingStudentCode > 0 ? "text-amber-600" : ""
                }`}
              >
                {board.awaitingStudentCode}
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">ชำระแล้วเกิน 3 วัน</span>
          </Link>

          <Link
            href="/documents"
            data-testid="tile-เอกสารไม่ครบ"
            className="hover:bg-accent flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">เอกสารไม่ครบ</span>
              <span className="font-mono text-base font-semibold tabular-nums md:text-lg">
                {board.incompleteDocuments}
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">ตรวจไม่ครบ 4 หมวด</span>
          </Link>

          <Link
            href="/queue"
            data-testid="tile-คิวโทรวันนี้"
            className="hover:bg-accent flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">คิวโทรวันนี้</span>
              <span className="font-mono text-base font-semibold tabular-nums md:text-lg">
                {initialQueue.total}
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">
              {initialQueue.overdue.length > 0 ? `เลยกำหนด ${initialQueue.overdue.length}` : "ตรงกำหนด"}
            </span>
          </Link>
        </section>
      )}

      {/* ===================== FILTER BAR ===================== */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex items-center">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 h-3.5 w-3.5" />
          <input
            type="search"
            aria-label="ค้นหาในคิว"
            placeholder="ค้นชื่อหรือเบอร์โทร"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-44 rounded-md border border-zinc-200 bg-white pr-2.5 pl-8 text-xs outline-none focus:border-[#0F2A4A] sm:w-56 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <select
          aria-label="กรองตามผู้ดูแล"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-[#0F2A4A] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="">ผู้ดูแล · ทั้งหมด</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="กรองตามคณะ"
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-[#0F2A4A] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="">คณะ · ทั้งหมด</option>
          {facultyList.map((f) => (
            <option key={f.id} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setOwnerFilter("");
              setFacultyFilter("");
            }}
            className="text-muted-foreground hover:text-foreground h-8 rounded-md px-2 text-xs"
          >
            ล้างตัวกรอง
          </button>
        )}

        <div className="text-muted-foreground ml-auto text-[11px]">
          แสดง {totalShown} จาก {initialQueue.overdue.length + initialQueue.today.length} ราย
        </div>
      </div>

      {/* ===================== OVERDUE QUEUE ===================== */}
      {overdueList.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="text-xs font-semibold text-red-600 md:text-sm">
              เลยกำหนดแล้ว {overdueList.length} คน
            </h2>
            <span className="text-muted-foreground text-[11px]">
              ควรโทรก่อนเป็นอันดับแรก
            </span>
          </div>

          <QueueTable
            items={overdueList}
            overdue
            logged={logged}
            openRowId={openRowId}
            sheetOpen={sheetOpen}
            pending={pending}
            outcome={outcome}
            nextDate={nextDate}
            note={note}
            error={error}
            onOpenPopover={openPopover}
            onOpenSheet={openSheet}
            onCloseLogger={closeLogger}
            onSetOutcome={setOutcome}
            onSetNextDate={setNextDate}
            onSetNote={setNote}
            onSubmitCall={submitCallForm}
          />
        </section>
      )}

      {/* ===================== TODAY QUEUE ===================== */}
      {todayList.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            <h2 className="text-xs font-semibold text-zinc-800 md:text-sm dark:text-zinc-200">
              ถึงกำหนดวันนี้ {todayList.length} คน
            </h2>
          </div>

          <QueueTable
            items={todayList}
            logged={logged}
            openRowId={openRowId}
            sheetOpen={sheetOpen}
            pending={pending}
            outcome={outcome}
            nextDate={nextDate}
            note={note}
            error={error}
            onOpenPopover={openPopover}
            onOpenSheet={openSheet}
            onCloseLogger={closeLogger}
            onSetOutcome={setOutcome}
            onSetNextDate={setNextDate}
            onSetNote={setNote}
            onSubmitCall={submitCallForm}
          />
        </section>
      )}

      {totalShown === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-sm font-medium">ไม่พบคิวโทรที่ตรงกับเงื่อนไข</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isFiltered
              ? "ลองเปลี่ยนตัวกรองหรือล้างคำค้นหา"
              : "วันนี้ไม่มีคิวโทร คิวจะขึ้นเองเมื่อมีการนัดโทรครั้งถัดไป"}
          </p>
        </div>
      )}

      {/* ===================== MOBILE BOTTOM SHEET ===================== */}
      {sheetOpen && activePerson && (
        <div
          role="dialog"
          aria-label="บันทึกการโทร"
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={closeLogger}
          />
          <div className="relative z-10 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  บันทึกการโทร
                </h3>
                <p className="text-muted-foreground text-xs">
                  {activePerson.fullName} {activePerson.phone ? `· ${formatPhone(activePerson.phone)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogger}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3">
              <span className="text-muted-foreground mb-1.5 block text-xs font-medium">
                ผลการโทร
              </span>
              <div className="grid grid-cols-2 gap-2">
                {CALL_OUTCOMES.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant={outcome === opt ? "default" : "outline"}
                    className="h-11 text-xs font-medium"
                    data-testid={`outcome-${opt}`}
                    onClick={() => {
                      setOutcome(opt);
                      if (CLOSING_OUTCOMES.has(opt)) setNextDate("");
                    }}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>

            {outcome && !CLOSING_OUTCOMES.has(outcome) && (
              <div className="mb-3">
                <span className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  นัดโทรครั้งถัดไป
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_DAYS.map((q) => (
                    <Button
                      key={q.days}
                      type="button"
                      size="sm"
                      variant={nextDate === toDateInputValue(q.days) ? "default" : "outline"}
                      onClick={() => setNextDate(toDateInputValue(q.days))}
                      className="h-8 text-xs"
                    >
                      {q.label}
                    </Button>
                  ))}
                  <input
                    type="date"
                    aria-label="เลือกวันเอง"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-8 rounded-md border border-zinc-200 bg-white px-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <span className="text-muted-foreground mb-1 block text-xs font-medium">
                บันทึกย่อ
              </span>
              <textarea
                rows={2}
                placeholder="เช่น ขอให้โทรกลับหลัง 17:00 น."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white p-2 text-xs outline-none focus:border-[#0F2A4A] dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            {error && (
              <p role="alert" data-testid="call-error" className="mb-3 text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeLogger}
                className="h-11 flex-1 text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                data-testid="submit-log-call"
                disabled={pending || !outcome}
                onClick={() => submitCallForm(activePerson.id)}
                className="h-11 flex-1 text-xs font-medium"
              >
                {pending ? "กำลังบันทึก…" : "บันทึกผลโทร"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueTable({
  items,
  overdue,
  logged,
  openRowId,
  sheetOpen,
  pending,
  outcome,
  nextDate,
  note,
  error,
  onOpenPopover,
  onOpenSheet,
  onCloseLogger,
  onSetOutcome,
  onSetNextDate,
  onSetNote,
  onSubmitCall,
}: {
  items: QueueItem[];
  overdue?: boolean;
  logged: Record<string, LoggedState>;
  openRowId: string | null;
  sheetOpen: boolean;
  pending: boolean;
  outcome: CallOutcome | null;
  nextDate: string;
  note: string;
  error: string | null;
  onOpenPopover: (id: string) => void;
  onOpenSheet: (id: string) => void;
  onCloseLogger: () => void;
  onSetOutcome: (o: CallOutcome) => void;
  onSetNextDate: (d: string) => void;
  onSetNote: (n: string) => void;
  onSubmitCall: (id: string) => void;
}) {
  return (
    <>
      {/* Desktop Table */}
      <div
        className={`hidden rounded-lg border border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900 ${
          openRowId && !sheetOpen ? "overflow-visible" : "overflow-x-auto"
        }`}
      >
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-800/40">
              <th className="w-12 px-3 py-2 text-left font-medium text-zinc-500">ลำดับ</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">ชื่อ</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">เบอร์</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">หลักสูตร</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">ตามมาแล้ว</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                {overdue ? "เลยกำหนด" : "นัดไว้"}
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">ผลครั้งล่าสุด</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">ผู้ดูแล</th>
              <th className="sticky right-0 w-32 border-l border-zinc-200 bg-zinc-50/95 px-3 py-2 text-right font-medium text-zinc-500 shadow-xs dark:border-zinc-800 dark:bg-zinc-800/95">
                การกระทำ
              </th>
            </tr>
          </thead>
          <tbody data-testid={overdue ? "overdue-rows" : "today-rows"}>
            {items.map((item, idx) => {
              const late = daysOverdue(item.nextCallAt) ?? 0;
              const log = logged[item.id];
              const isOpen = !sheetOpen && openRowId === item.id;
              const calls = (item.callCount ?? 0) + (log ? 1 : 0);

              return (
                <tr
                  key={item.id}
                  className={`border-b border-zinc-100 last:border-b-0 transition-colors dark:border-zinc-800/60 ${
                    isOpen ? "relative z-30" : ""
                  } ${
                    log ? "bg-emerald-50/40 dark:bg-emerald-950/20" : isOpen ? "bg-zinc-50 dark:bg-zinc-800/40" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-zinc-400">
                    {String(idx + 1).padStart(2, "0")}
                  </td>

                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <Link
                      href={`/leads/${item.id}`}
                      className="text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {item.fullName}
                    </Link>
                  </td>

                  <td className="px-3 py-2 font-mono whitespace-nowrap tabular-nums">
                    {item.phone ? (
                      <a
                        href={`tel:${item.phone.replace(/-/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-[#0F2A4A] hover:underline dark:text-blue-400"
                      >
                        <Phone className="h-3 w-3" />
                        {formatPhone(item.phone)}
                      </a>
                    ) : (
                      <span className="text-zinc-400">{item.facebookName ?? "—"}</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                      {item.programName ?? "—"}
                    </div>
                    {item.facultyName ? (
                      <div className="text-[11px] text-zinc-400">
                        {item.facultyName} {item.studyMode ? `· ${item.studyMode}` : ""}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                    {calls} ครั้ง
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {log ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        บันทึกแล้ว
                      </span>
                    ) : overdue ? (
                      <Badge variant="destructive">เลย {late} วัน</Badge>
                    ) : (
                      <span className="font-mono text-zinc-500 tabular-nums">
                        {formatThaiDate(item.nextCallAt)}
                      </span>
                    )}
                  </td>

                  <td className="max-w-48 truncate px-3 py-2">
                    {log ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {log.outcome}
                        {log.note ? ` · ${log.note}` : ""}
                      </span>
                    ) : item.lastCallOutcome ? (
                      <>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {item.lastCallOutcome}
                        </span>
                        {item.lastCallNote ? (
                          <span className="text-zinc-400"> · {item.lastCallNote}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-zinc-400">ยังไม่เคยโทร</span>
                    )}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {item.ownerName ?? "—"}
                  </td>

                  {/* Sticky Action Cell with Desktop Popover */}
                  <td className={`sticky right-0 border-l border-zinc-200 bg-white px-3 py-1.5 text-right shadow-xs dark:border-zinc-800 dark:bg-zinc-900 ${isOpen ? "relative z-40" : "z-1"}`}>
                    <Button
                      size="sm"
                      variant={log ? "outline" : "default"}
                      data-testid={`open-log-call-${item.id}`}
                      onClick={() => onOpenPopover(item.id)}
                      className={`h-7 px-2.5 text-xs font-medium ${
                        log
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-[#0F2A4A] text-white hover:bg-[#163A63]"
                      }`}
                    >
                      {log ? "บันทึกแล้ว · แก้ไข" : "บันทึกการโทร"}
                    </Button>

                    {/* Inline Popover Dialog */}
                    {isOpen && (
                      <div
                        role="dialog"
                        aria-label="บันทึกการโทร"
                        className="absolute top-full right-2 z-50 mt-1 w-80 rounded-xl border border-zinc-200 bg-white p-3.5 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className="mb-2.5 flex items-start justify-between">
                          <div>
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              บันทึกการโทร
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {item.fullName} {item.phone ? `· ${formatPhone(item.phone)}` : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={onCloseLogger}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mb-2.5">
                          <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                            ผลการโทร
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {CALL_OUTCOMES.map((opt) => (
                              <Button
                                key={opt}
                                type="button"
                                size="sm"
                                variant={outcome === opt ? "default" : "outline"}
                                className="h-7 text-[11px] font-normal"
                                data-testid={`outcome-${opt}`}
                                onClick={() => {
                                  onSetOutcome(opt);
                                  if (CLOSING_OUTCOMES.has(opt)) onSetNextDate("");
                                }}
                              >
                                {opt}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {outcome && !CLOSING_OUTCOMES.has(outcome) && (
                          <div className="mb-2.5">
                            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                              นัดโทรครั้งถัดไป
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {QUICK_DAYS.map((q) => (
                                <Button
                                  key={q.days}
                                  type="button"
                                  size="sm"
                                  variant={nextDate === toDateInputValue(q.days) ? "default" : "outline"}
                                  onClick={() => onSetNextDate(toDateInputValue(q.days))}
                                  className="h-6 px-1.5 text-[10.5px]"
                                >
                                  {q.label}
                                </Button>
                              ))}
                              <input
                                type="date"
                                aria-label="เลือกวันเอง"
                                value={nextDate}
                                onChange={(e) => onSetNextDate(e.target.value)}
                                className="h-6 w-28 rounded-md border border-zinc-200 bg-white px-1.5 font-mono text-[10.5px] dark:border-zinc-700 dark:bg-zinc-800"
                              />
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                            บันทึกย่อ
                          </span>
                          <textarea
                            rows={2}
                            placeholder="เช่น ขอให้โทรกลับหลัง 17:00 น."
                            value={note}
                            onChange={(e) => onSetNote(e.target.value)}
                            className="w-full rounded-md border border-zinc-200 bg-white p-1.5 text-xs outline-none focus:border-[#0F2A4A] dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>

                        {error && (
                          <p role="alert" data-testid="call-error" className="mb-2 text-xs text-red-600">
                            {error}
                          </p>
                        )}

                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onCloseLogger}
                            className="h-7 text-xs"
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            data-testid="submit-log-call"
                            disabled={pending || !outcome}
                            onClick={() => onSubmitCall(item.id)}
                            className="h-7 flex-1 text-xs font-medium"
                          >
                            {pending ? "กำลังบันทึก…" : "บันทึกผลโทร"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((item) => {
          const late = daysOverdue(item.nextCallAt) ?? 0;
          const log = logged[item.id];
          const calls = (item.callCount ?? 0) + (log ? 1 : 0);

          return (
            <article
              key={item.id}
              className={`rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 ${
                log ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/leads/${item.id}`}
                    className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {item.fullName}
                  </Link>
                  <div className="text-muted-foreground text-[11.5px]">
                    {item.programName ?? "—"} {item.studyMode ? `· ${item.studyMode}` : ""}
                  </div>
                </div>

                {log ? (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                    บันทึกแล้ว
                  </Badge>
                ) : overdue ? (
                  <Badge variant="destructive">เลย {late} วัน</Badge>
                ) : (
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {formatThaiDate(item.nextCallAt)}
                  </span>
                )}
              </div>

              {item.phone && (
                <div className="mt-2.5">
                  <a
                    href={`tel:${item.phone.replace(/-/g, "")}`}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white font-mono text-xs font-medium text-[#0F2A4A] shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(item.phone)}
                  </a>
                </div>
              )}

              <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
                <span>ตามมาแล้ว {calls} ครั้ง</span>
                <span>ผู้ดูแล: {item.ownerName ?? "—"}</span>
              </div>

              {(log?.note || item.lastCallNote || item.lastCallOutcome) && (
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {log
                    ? `${log.outcome}${log.note ? ` · ${log.note}` : ""}`
                    : `${item.lastCallOutcome ?? ""}${item.lastCallNote ? ` · ${item.lastCallNote}` : ""}`}
                </p>
              )}

              <Button
                type="button"
                variant={log ? "outline" : "default"}
                data-testid={`open-log-call-${item.id}`}
                onClick={() => onOpenSheet(item.id)}
                className={`mt-2.5 h-10 w-full text-xs font-medium ${
                  log
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "bg-[#0F2A4A] text-white"
                }`}
              >
                {log ? "บันทึกแล้ว · แก้ไข" : "บันทึกการโทร"}
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}
