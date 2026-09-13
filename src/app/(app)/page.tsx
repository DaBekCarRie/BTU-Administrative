import { getFunnelComparison } from "@/lib/data/funnel";

import { HomeFunnel } from "./home-funnel";
import { loadQueueView } from "./queue/load";
import { QueueView } from "./queue/queue-view";

/**
 * หน้าแรก: ภาพรวมการรับสมัครด้านบน คิวโทรวันนี้ด้านล่างในหน้าเดียว (ใบ 08)
 * เจ้าหน้าที่เปิดระบบมาแล้วยังเห็นคิวโทรทันที ไม่ต้องกดเพิ่มอีกคลิก
 */
export default async function HomePage() {
  const [funnel, queue] = await Promise.all([getFunnelComparison(), loadQueueView()]);

  return (
    <>
      <HomeFunnel funnel={funnel} />
      <QueueView {...queue} />
    </>
  );
}
