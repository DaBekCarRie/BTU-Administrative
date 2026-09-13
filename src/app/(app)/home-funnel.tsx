import { FUNNEL_STAGES, type FunnelComparison } from "@/lib/data/funnel";
import type { FunnelFilters } from "@/lib/data/funnel-filters";

import { HomeFunnelFilters } from "./home-funnel-filters";

/** ส่วนต่างเป็นข้อความสีกลาง — ไม่ใช่การประเมินว่าดีหรือแย่ จึงไม่ใช้เขียวแดง */
function deltaText(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "เท่าเดิม";
  return `${diff > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(diff).toLocaleString("th-TH")}`;
}

/**
 * กรวยการรับสมัครของเดือนนี้เทียบเดือนที่แล้ว (ใบ 08)
 *
 * ตัวเลขล้วน ไม่มีกราฟ — spec รอให้ทีมใช้จริงก่อนจึงรู้ว่าอยากเห็นกราฟอะไร
 * ไม่มีตัวเลขแยกรายบุคคลของเจ้าหน้าที่ (ADR-0004)
 */
export function HomeFunnel({
  funnel,
  filters,
  faculties,
  months,
}: {
  funnel: FunnelComparison;
  filters: FunnelFilters;
  faculties: { id: string; name: string }[];
  months: string[];
}) {
  const { current, previous } = funnel;

  return (
    <section
      data-testid="home-funnel"
      aria-labelledby="home-funnel-title"
      className="px-4 pt-4 md:px-6 md:pt-6"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="home-funnel-title"
          className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          ภาพรวมการรับสมัคร
        </h2>
        <p className="text-muted-foreground text-xs">
          คนที่ติดต่อเข้ามาใน {current.label} ตอนนี้ไปถึงขั้นไหนแล้ว · เทียบกับ {previous.label}
        </p>
      </div>

      <HomeFunnelFilters filters={filters} faculties={faculties} months={months} />

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {FUNNEL_STAGES.map((stage, index) => {
          const now = current.counts[stage.key];
          const before = previous.counts[stage.key];
          const empty = now === 0 && before === 0;

          return (
            <li
              key={stage.key}
              data-testid={`funnel-${stage.key}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:block dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {index > 0 ? <span aria-hidden="true">→ </span> : null}
                {stage.label}
              </div>
              <div className="text-right sm:mt-1 sm:text-left">
                <div className="font-mono text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {now.toLocaleString("th-TH")}
                </div>
                {empty ? (
                  <div className="text-muted-foreground text-[11px]">
                    ยังไม่มีข้อมูล — เริ่มนับเมื่อทีมบันทึกขั้นนี้
                  </div>
                ) : (
                  <div className="text-muted-foreground text-[11px]">
                    {previous.label} {before.toLocaleString("th-TH")} · {deltaText(now, before)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
