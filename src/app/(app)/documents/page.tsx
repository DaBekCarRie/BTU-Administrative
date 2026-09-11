import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DOC_TYPES, listIncompleteDocuments } from "@/lib/data/documents";

export default async function DocumentsPage() {
  const people = await listIncompleteDocuments();

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">เอกสาร</h1>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="documents-summary">
          เอกสารยังไม่ครบ {people.length} คน · ครบคือตรวจผ่านทั้ง {DOC_TYPES.length} ประเภท
        </p>
      </header>

      {people.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">เอกสารครบทุกคนแล้ว</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b">
                {["ชื่อ", "ตรวจผ่านแล้ว", "อัปโหลดแล้ว", "ยังขาด"].map((label) => (
                  <th
                    key={label}
                    className="text-muted-foreground px-3 py-1.5 text-left text-xs font-normal whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="incomplete-rows">
              {people.map((person) => (
                <tr key={person.id} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 font-medium">
                    <Link
                      href={`/leads/${person.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {person.passed}/{DOC_TYPES.length}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{person.uploaded}</td>
                  <td className="px-3 py-1.5">
                    <Badge variant="secondary">
                      {DOC_TYPES.length - person.passed} ประเภท
                    </Badge>
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
