import Link from "next/link";

import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { listStaffOptions } from "@/lib/data/people";
import { LeadForm } from "./lead-form";

export default async function NewLeadPage() {
  const [faculties, staff] = await Promise.all([
    listFacultiesWithPrograms({ activeOnly: true }),
    listStaffOptions(),
  ]);

  return (
    <div className="p-6">
      <header className="mb-6">
        <Link
          href="/leads"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← กลับไปรายชื่อ
        </Link>
        <h1 className="mt-2 text-xl font-semibold">เพิ่มผู้สนใจ</h1>
      </header>

      <LeadForm faculties={faculties} staff={staff} />
    </div>
  );
}
