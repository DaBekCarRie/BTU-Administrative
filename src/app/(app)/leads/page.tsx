import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { listPeople, listStaffOptions } from "@/lib/data/people";
import { parseFilters, toSearchParams } from "@/lib/data/people-filters";
import { formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";
import { LeadFilters } from "./filters";

const HEADERS = [
  "ชื่อ",
  "ช่องทางติดต่อ",
  "หลักสูตร",
  "ภาค",
  "สถานะติดตาม",
  "ผู้ดูแล",
  "ล่าสุด",
] as const;

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

      {result.items.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ไม่พบผู้สนใจที่ตรงกับเงื่อนไข</p>
          <p className="text-muted-foreground mt-1 text-sm">
            ลองล้างตัวกรอง หรือพิมพ์คำค้นให้สั้นลง
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b">
                {HEADERS.map((label) => (
                  <th
                    key={label}
                    className="text-muted-foreground px-3 py-1.5 text-left text-xs font-normal whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="lead-rows">
              {result.items.map((person) => (
                <tr key={person.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                    <Link
                      href={`/leads/${person.id}/edit`}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                    {person.phone ? (
                      <a
                        href={`tel:${person.phone}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatPhone(person.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        {person.facebookName ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {person.programName ??
                      person.facultyName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {person.studyMode ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <Badge variant="secondary">{person.followUpStatus}</Badge>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {person.ownerName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 whitespace-nowrap">
                    {formatThaiDate(person.lastEventAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
