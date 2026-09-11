import { Badge } from "@/components/ui/badge";
import { listAnswers, STALE_AFTER_DAYS } from "@/lib/data/answers";
import { formatThaiDate, fromNowThai } from "@/lib/date";
import { AddAnswerDialog, ConfirmAnswerButton } from "./answer-actions";
import { FaqFilters } from "./filters";

export default async function FaqPage({ searchParams }: PageProps<"/faq">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const visibility =
    typeof params.visibility === "string" ? params.visibility : "";

  const answers = await listAnswers({ q, visibility });
  const staleCount = answers.filter((item) => item.isStale).length;

  return (
    <div className="p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">คำถามที่พบบ่อย</h1>
          <p className="text-muted-foreground mt-1 text-sm" data-testid="faq-summary">
            {answers.length} คำถาม
            {staleCount > 0 ? ` · ควรยืนยันใหม่ ${staleCount}` : ""}
          </p>
        </div>
        <AddAnswerDialog />
      </header>

      <FaqFilters />

      {answers.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ไม่พบคำถามที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="answer-list">
          {answers.map((item) => (
            <li key={item.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-medium">{item.question}</h2>
                <Badge
                  variant={
                    item.visibility === "ใช้ภายในเท่านั้น"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {item.visibility}
                </Badge>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{item.answer}</p>

              {item.source ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  ที่มา: {item.source}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {item.confirmedAt
                    ? `ยืนยันล่าสุด ${formatThaiDate(item.confirmedAt)} (${fromNowThai(item.confirmedAt)})`
                    : "ยังไม่เคยยืนยัน"}
                  {item.confirmedByName ? ` · โดย ${item.confirmedByName}` : ""}
                </span>

                {item.isStale ? (
                  <Badge
                    className="bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    data-testid={`stale-${item.id}`}
                  >
                    ควรยืนยันใหม่
                  </Badge>
                ) : null}

                <ConfirmAnswerButton id={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground mt-5 max-w-prose text-xs">
        คำตอบที่ไม่ได้ยืนยันเกิน {STALE_AFTER_DAYS} วันจะขึ้นป้ายเตือน
        เพราะกฎของมหาวิทยาลัยเปลี่ยนบ่อย — คำตอบเก่าที่ดูน่าเชื่อถืออันตรายกว่าไม่มีคำตอบ
      </p>
    </div>
  );
}
