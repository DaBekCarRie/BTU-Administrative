import { listReferenceDocuments } from "@/lib/data/reference-documents";
import { isTeamLead } from "@/lib/data/staff";
import { parseReferenceFilters } from "@/lib/reference-shared";

import { ReferenceFiltersBar } from "./filters";
import { AddReferenceDialog, ReferenceList } from "./reference-view";

/**
 * เอกสารอ้างอิง (ใบ 06 · 07) — ของกลางที่ทีมเปิดดูเพื่ออ้างอิง ไม่ผูกกับคน
 * แยกเมนูจากเอกสารประจำตัว เพราะไม่มีการตรวจผ่าน/ไม่ผ่าน และไม่ใช่ข้อมูลส่วนบุคคล
 */
export default async function ReferencePage({ searchParams }: PageProps<"/reference">) {
  const filters = parseReferenceFilters(await searchParams);
  const [items, canDelete] = await Promise.all([listReferenceDocuments(filters), isTeamLead()]);
  const fileCount = items.reduce((sum, item) => sum + item.files.length, 0);
  const filtered = !!filters.q || !!filters.category || !!filters.year;

  return (
    <div className="p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">เอกสารอ้างอิง</h1>
          <p className="text-muted-foreground mt-1 text-sm" data-testid="reference-summary">
            {filtered ? "ตรงกับตัวกรอง " : ""}
            {items.length} รายการ · {fileCount} ไฟล์
          </p>
        </div>
        <AddReferenceDialog />
      </header>

      <ReferenceFiltersBar filters={filters} />
      <ReferenceList items={items} canDelete={canDelete} filtered={filtered} />
    </div>
  );
}
