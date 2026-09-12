import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { LogCallDialog } from "@/components/log-call-dialog";
import { getCallQueue, type QueueItem } from "@/lib/data/call-queue";
import { getWorkBoard, THRESHOLDS } from "@/lib/data/work-board";
import { daysOverdue, formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { DOC_TYPES } from "@/lib/documents-shared";

function QueueTable({
  items,
  overdue,
}: {
  items: QueueItem[];
  overdue?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b">
            {["ชื่อ", "เบอร์", "หลักสูตร", "ตามมาแล้ว", "ผลครั้งล่าสุด", overdue ? "เลยกำหนด" : "นัดไว้", ""].map(
              (label, index) => (
                <th
                  key={index}
                  className="text-muted-foreground px-3 py-1.5 text-left text-xs font-normal whitespace-nowrap"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody data-testid={overdue ? "overdue-rows" : "today-rows"}>
          {items.map((item) => {
            const late = daysOverdue(item.nextCallAt) ?? 0;
            return (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                  <Link
                    href={`/leads/${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.fullName}
                  </Link>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                  {item.phone ? (
                    <a
                      href={`tel:${item.phone}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {formatPhone(item.phone)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">
                      {item.facebookName ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {item.programName ?? <span className="text-muted-foreground">—</span>}
                  {item.studyMode ? (
                    <span className="text-muted-foreground block text-xs">
                      {item.studyMode}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                  {item.callCount} ครั้ง
                </td>
                <td className="max-w-56 truncate px-3 py-1.5">
                  {item.lastCallOutcome ? (
                    <>
                      {item.lastCallOutcome}
                      {item.lastCallNote ? (
                        <span className="text-muted-foreground"> · {item.lastCallNote}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">ยังไม่เคยโทร</span>
                  )}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {overdue ? (
                    <Badge variant="destructive">เลย {late} วัน</Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      {formatThaiDate(item.nextCallAt)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <LogCallDialog
                    personId={item.id}
                    personName={item.fullName}
                    triggerSize="sm"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ตัวเลขงานค้าง — กดแล้วไปหน้ารายชื่อที่กรองไว้แล้ว ไม่ใช่แค่ดูเฉย ๆ
 * ไม่มีตัวเลขแยกรายบุคคลของเจ้าหน้าที่ที่ไหนบนหน้านี้ ทีมตัดสินใจไม่ทำเรื่องวัดผลคน
 */
function WorkTile({
  label,
  value,
  href,
  hint,
  urgent,
}: {
  label: string;
  value: number;
  href: string;
  hint?: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={`tile-${label}`}
      className="hover:bg-accent flex flex-col gap-0.5 rounded-md border px-4 py-3 transition-colors"
    >
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`text-2xl tabular-nums ${urgent && value > 0 ? "text-destructive" : ""}`}
      >
        {value.toLocaleString("th-TH")}
      </span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </Link>
  );
}

export default async function QueuePage() {
  const [queue, board] = await Promise.all([getCallQueue(), getWorkBoard()]);
  const shown = queue.overdue.length + queue.today.length;
  const total = queue.total;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">คิวโทรวันนี้</h1>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="queue-summary">
          ต้องโทร {total.toLocaleString("th-TH")} คน
          {queue.truncated ? ` (แสดง ${shown} รายแรก)` : ""}
          {queue.overdue.length > 0 ? ` · เลยกำหนด ${queue.overdue.length}` : ""}
        </p>
      </header>

      <section
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="work-board"
      >
        <WorkTile
          label="ไม่มีใครแตะ"
          value={board.staleLeads}
          href="/leads?status=กำลังติดตาม"
          hint={`เกิน ${THRESHOLDS.staleLeadDays} วัน`}
          urgent
        />
        <WorkTile
          label="รอรหัสนักศึกษา"
          value={board.awaitingStudentCode}
          href="/leads?status=สมัครแล้ว"
          hint={`ชำระแล้วเกิน ${THRESHOLDS.awaitingStudentCodeDays} วัน`}
          urgent
        />
        <WorkTile
          label="เอกสารไม่ครบ"
          value={board.incompleteDocuments}
          href="/documents"
          hint={`ตรวจผ่านไม่ถึง ${DOC_TYPES.length} ประเภท`}
        />
        <WorkTile
          label="คิวโทรวันนี้"
          value={total}
          href="/queue"
          hint={queue.overdue.length > 0 ? `เลยกำหนด ${queue.overdue.length}` : undefined}
        />
      </section>

      <p
        className="text-muted-foreground mb-6 text-sm tabular-nums"
        data-testid="totals-strip"
      >
        เดือนนี้สมัคร {board.appliedThisMonth.toLocaleString("th-TH")} ·
        เรียนอยู่ {board.enrolled.toLocaleString("th-TH")} ·
        ดรอป {board.dropped.toLocaleString("th-TH")}
      </p>

      {shown === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">วันนี้ไม่มีคิวโทร</p>
          <p className="text-muted-foreground mt-1 text-sm">
            คิวจะขึ้นเองเมื่อมีการนัดโทรครั้งถัดไปจากการบันทึกผลโทร
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {queue.overdue.length > 0 ? (
            <section>
              <h2 className="text-destructive mb-2 text-sm font-semibold">
                เลยกำหนดแล้ว {queue.overdue.length} คน
              </h2>
              <QueueTable items={queue.overdue} overdue />
            </section>
          ) : null}

          {queue.today.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold">
                ถึงกำหนดวันนี้ {queue.today.length} คน
              </h2>
              <QueueTable items={queue.today} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
