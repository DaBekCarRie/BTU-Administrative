import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentChecklistPanel } from "@/components/document-checklist";
import { listApplications } from "@/lib/data/applications";
import { getChecklist } from "@/lib/data/documents";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { getPersonDetail, listTimeline } from "@/lib/data/people";
import { formatThaiDate, formatThaiDateTime, fromNowThai } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { CloseLeadForm } from "./close-lead-form";
import { MergeForm } from "./merge-form";
import { NationalIdPanel } from "./national-id-panel";
import { ApplicationsPanel } from "./applications-panel";
import { LogCallDialog } from "@/components/log-call-dialog";

/** สถานะการเรียนและการเงินเป็นสำเนาจากหน่วยงานอื่น (ADR-0003) */
function CopiedStatus({
  label,
  value,
  confirmedAt,
}: {
  label: string;
  value: string;
  confirmedAt: string | null;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5">
        {value}
        <span className="text-muted-foreground ml-2 text-xs">
          {confirmedAt
            ? `ยืนยันล่าสุด ${fromNowThai(confirmedAt)}`
            : "ยังไม่เคยยืนยัน"}
        </span>
      </dd>
    </div>
  );
}

function describe(type: string, payload: Record<string, unknown>): string {
  const note = typeof payload.note === "string" ? payload.note : "";
  switch (type) {
    case "ยื่นสมัคร":
      return `ปีการศึกษา ${payload.academicYear}`;
    case "ชำระเงิน":
      return `${Number(payload.amount).toLocaleString("th-TH")} บาท · ${payload.paymentStatus}`;
    case "ได้รหัสนักศึกษา":
      return `รหัส ${payload.studentCode}`;
    case "โทรตาม":
      return [payload.outcome, note].filter(Boolean).join(" · ");
    case "ปิดเคส":
      return [`เหตุผล: ${payload.reason}`, note].filter(Boolean).join(" · ");
    case "แก้ไขข้อมูล":
      return `แก้ ${Object.keys(payload).length} ช่อง`;
    case "ติดต่อเข้ามา":
      return payload.source ? `ทาง ${payload.source}` : "";
    default:
      return note;
  }
}

export default async function PersonPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const [person, timeline, checklist, applications, faculties] =
    await Promise.all([
      getPersonDetail(id),
      listTimeline(id),
      getChecklist(id),
      listApplications(id),
      listFacultiesWithPrograms({ activeOnly: true }),
    ]);

  if (!person) notFound();

  return (
    <div className="p-6">
      <Link
        href="/leads"
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
      >
        ← กลับไปรายชื่อ
      </Link>

      <header className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {person.full_name}
            {person.nickname ? (
              <span className="text-muted-foreground ml-2 text-base font-normal">
                ({person.nickname})
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ติดต่อเข้ามาเมื่อ {formatThaiDate(person.first_contacted_at)}
            {person.staff ? ` · ดูแลโดย ${person.staff.display_name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/leads/${person.id}/edit`}>แก้ไขข้อมูล</Link>
          </Button>
          <LogCallDialog personId={person.id} personName={person.full_name} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
        <ApplicationsPanel
          personId={person.id}
          applications={applications}
          faculties={faculties}
        />

        <section>
          <h2 className="mb-3 text-sm font-semibold">
            ประวัติการติดตาม
            <span className="text-muted-foreground ml-2 font-normal">
              {timeline.length} รายการ
            </span>
          </h2>

          {timeline.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              ยังไม่มีประวัติ
            </p>
          ) : (
            <ol className="border-l pl-4" data-testid="timeline">
              {timeline.map((entry) => (
                <li key={entry.id} className="relative pb-5 last:pb-0">
                  <span className="bg-border absolute top-1.5 -left-[21px] size-2 rounded-full" />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{entry.type}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatThaiDate(entry.occurredAt)}
                      {entry.recordedBy ? ` · ${entry.recordedBy}` : ""}
                    </span>
                  </div>
                  {describe(entry.type, entry.payload) ? (
                    <p className="mt-0.5 text-sm">
                      {describe(entry.type, entry.payload)}
                    </p>
                  ) : null}
                  {entry.occurredAt.slice(0, 10) !==
                  entry.recordedAt.slice(0, 10) ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      บันทึกย้อนหลังเมื่อ {formatThaiDateTime(entry.recordedAt)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-md border p-4" data-testid="status-panel">
            <h2 className="mb-3 text-sm font-semibold">สถานะ</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">การติดตาม</dt>
                <dd className="mt-0.5">
                  <Badge variant="secondary" data-testid="follow-up-status">
                    {person.follow_up_status}
                  </Badge>
                  {person.next_call_at ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      นัดโทร {formatThaiDate(person.next_call_at)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <CopiedStatus
                label="การเรียน"
                value={person.enrollment_status}
                confirmedAt={person.enrollment_status_confirmed_at}
              />
              <CopiedStatus
                label="การเงิน"
                value={person.payment_status}
                confirmedAt={person.payment_status_confirmed_at}
              />
            </dl>
          </div>

          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-semibold">ข้อมูลติดต่อ</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">เบอร์โทร</dt>
                <dd className="mt-0.5 tabular-nums">
                  {person.phone ? (
                    <a
                      href={`tel:${person.phone}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {formatPhone(person.phone)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Facebook / Line</dt>
                <dd className="mt-0.5">
                  {person.facebook_name ?? person.line_id ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">หลักสูตร</dt>
                <dd className="mt-0.5">
                  {person.programs?.name ?? person.faculties?.name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {person.study_mode ? ` · ${person.study_mode}` : ""}
                </dd>
              </div>
              <NationalIdPanel
                personId={person.id}
                last4={person.national_id_last4}
              />

              {person.note ? (
                <div>
                  <dt className="text-muted-foreground text-xs">หมายเหตุ</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{person.note}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <DocumentChecklistPanel personId={person.id} checklist={checklist} />

          <MergeForm personId={person.id} phone={person.phone} />

          <CloseLeadForm
            personId={person.id}
            alreadyClosed={["ไม่สนใจ", "ติดต่อไม่ได้", "สมัครแล้ว"].includes(
              person.follow_up_status,
            )}
          />
        </aside>
      </div>
    </div>
  );
}
