import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { LogCallDialog } from "@/components/log-call-dialog";
import { getCallQueue, countStale, type QueueItem } from "@/lib/data/call-queue";
import { daysOverdue, formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";

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

export default async function QueuePage() {
  const [queue, stale] = await Promise.all([getCallQueue(), countStale(7)]);
  const total = queue.overdue.length + queue.today.length;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">คิวโทรวันนี้</h1>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="queue-summary">
          ต้องโทร {total} คน
          {queue.overdue.length > 0 ? ` · เลยกำหนด ${queue.overdue.length}` : ""}
          {" · "}
          <Link href="/leads" className="underline underline-offset-4">
            ไม่มีใครแตะเกิน 7 วัน {stale} คน
          </Link>
        </p>
      </header>

      {total === 0 ? (
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
