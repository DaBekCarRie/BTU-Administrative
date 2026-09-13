import { getFunnelComparison } from "@/lib/data/funnel";
import { FUNNEL_HISTORY_MONTHS, parseFunnelFilters } from "@/lib/data/funnel-filters";
import { monthRangeBangkok } from "@/lib/date";

import { HomeFunnel } from "./home-funnel";
import { loadQueueView } from "./queue/load";
import { QueueView } from "./queue/queue-view";

/**
 * หน้าแรก: ภาพรวมการรับสมัครด้านบน คิวโทรวันนี้ด้านล่างในหน้าเดียว (ใบ 08)
 * เจ้าหน้าที่เปิดระบบมาแล้วยังเห็นคิวโทรทันที ไม่ต้องกดเพิ่มอีกคลิก
 * ตัวกรองคณะ ภาค และเดือนย้อนหลังอยู่ใน URL (ใบ 09)
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const filters = parseFunnelFilters(await searchParams);

  const [funnel, queue] = await Promise.all([getFunnelComparison(filters), loadQueueView()]);

  const months = Array.from(
    { length: FUNNEL_HISTORY_MONTHS },
    (_, index) => monthRangeBangkok(-index).label,
  );

  return (
    <>
      <HomeFunnel
        funnel={funnel}
        filters={filters}
        faculties={queue.facultyList}
        months={months}
      />
      <QueueView {...queue} />
    </>
  );
}
