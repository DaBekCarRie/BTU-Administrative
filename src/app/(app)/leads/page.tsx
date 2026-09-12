import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { listPeople, listStaffOptions } from "@/lib/data/people";
import { parseFilters, toSearchParams } from "@/lib/data/people-filters";
import { LeadFilters } from "./filters";
import { LeadsView } from "./leads-view";

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const filters = parseFilters(await searchParams);

  const [result, faculties, staff] = await Promise.all([
    listPeople(filters),
    listFacultiesWithPrograms(),
    listStaffOptions(),
  ]);

  const exportHref = `/leads/export?${toSearchParams(filters).toString()}`;

  function pageHref(page: number) {
    const params = toSearchParams(filters);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const query = params.toString();
    return query ? `/leads?${query}` : "/leads";
  }

  return (
    <div className="p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">ผู้สนใจ</h1>
          <p className="text-muted-foreground mt-1 text-sm" data-testid="result-count">
            {result.total.toLocaleString("th-TH")} ราย
            {result.pageCount > 1
              ? ` · หน้า ${result.page} จาก ${result.pageCount}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={exportHref} data-testid="export-link">
              ส่งออก Excel
            </a>
          </Button>
          <Button asChild>
            <Link href="/leads/new">เพิ่มผู้สนใจ</Link>
          </Button>
        </div>
      </header>

      <LeadFilters faculties={faculties} staff={staff} />

      <LeadsView
        items={result.items}
        staff={staff}
        currentStatus={filters.status ?? ""}
      />


      {result.pageCount > 1 ? (
        <nav className="mt-4 flex items-center gap-2" aria-label="แบ่งหน้า">
          <Button
            asChild={result.page > 1}
            variant="outline"
            size="sm"
            disabled={result.page <= 1}
          >
            {result.page > 1 ? (
              <Link href={pageHref(result.page - 1)}>ก่อนหน้า</Link>
            ) : (
              <span>ก่อนหน้า</span>
            )}
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {result.page} / {result.pageCount}
          </span>
          <Button
            asChild={result.page < result.pageCount}
            variant="outline"
            size="sm"
            disabled={result.page >= result.pageCount}
          >
            {result.page < result.pageCount ? (
              <Link href={pageHref(result.page + 1)}>ถัดไป</Link>
            ) : (
              <span>ถัดไป</span>
            )}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
