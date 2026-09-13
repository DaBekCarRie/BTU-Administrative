import { listReferenceDocuments } from "@/lib/data/reference-documents";

import { AddReferenceDialog, ReferenceList } from "./reference-view";

/**
 * เอกสารอ้างอิง (ใบ 06) — ของกลางที่ทีมเปิดดูเพื่ออ้างอิง ไม่ผูกกับคน
 * แยกเมนูจากเอกสารประจำตัว เพราะไม่มีการตรวจผ่าน/ไม่ผ่าน และไม่ใช่ข้อมูลส่วนบุคคล
 */
export default async function ReferencePage() {
  const items = await listReferenceDocuments();
  const fileCount = items.reduce((sum, item) => sum + item.files.length, 0);

  return (
    <div className="p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">เอกสารอ้างอิง</h1>
          <p className="text-muted-foreground mt-1 text-sm" data-testid="reference-summary">
            {items.length} รายการ · {fileCount} ไฟล์
          </p>
        </div>
        <AddReferenceDialog />
      </header>

      <ReferenceList items={items} />
    </div>
  );
}
