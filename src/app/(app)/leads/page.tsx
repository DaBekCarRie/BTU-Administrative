import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPeople } from "@/lib/data/people";
import { formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";

export default async function LeadsPage() {
  const people = await listPeople();

  return (
    <div className="p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">ผู้สนใจ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {people.length} ราย · การค้นหาและตัวกรองจะมาในใบ 04
          </p>
        </div>
        <Button asChild>
          <Link href="/leads/new">เพิ่มผู้สนใจ</Link>
        </Button>
      </header>

      {people.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ยังไม่มีผู้สนใจในระบบ</p>
          <p className="text-muted-foreground mt-1 text-sm">
            ข้อมูลเดิม 3,180 รายจะถูกนำเข้าในใบ 15
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "ชื่อ",
                  "ช่องทางติดต่อ",
                  "หลักสูตร",
                  "ภาค",
                  "สถานะติดตาม",
                  "ผู้ดูแล",
                  "ล่าสุด",
                ].map((label) => (
                  <th
                    key={label}
                    className="text-muted-foreground px-3 py-2 text-left text-xs font-normal whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="lead-rows">
              {people.map((person) => (
                <tr key={person.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                    <Link
                      href={`/leads/${person.id}/edit`}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
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
                  <td className="px-3 py-2.5">
                    {person.facultyName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {person.programName ? (
                      <span className="text-muted-foreground block text-xs">
                        {person.programName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {person.studyMode ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Badge variant="secondary">{person.followUpStatus}</Badge>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {person.ownerName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {formatThaiDate(person.lastEventAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
