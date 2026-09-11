import Link from "next/link";
import { notFound } from "next/navigation";

import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { getPersonForEdit, listStaffOptions } from "@/lib/data/people";
import { LeadForm } from "../../new/lead-form";

export default async function EditLeadPage({
  params,
}: PageProps<"/leads/[id]/edit">) {
  const { id } = await params;

  const [person, faculties, staff] = await Promise.all([
    getPersonForEdit(id),
    listFacultiesWithPrograms({ activeOnly: true }),
    listStaffOptions(),
  ]);

  if (!person) notFound();

  return (
    <div className="p-6">
      <header className="mb-6">
        <Link
          href="/leads"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← กลับไปรายชื่อ
        </Link>
        <h1 className="mt-2 text-xl font-semibold">แก้ไขข้อมูล {person.fullName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          การแก้ไขถูกบันทึกเป็นเหตุการณ์ ประวัติเดิมไม่หาย
        </p>
      </header>

      <LeadForm faculties={faculties} staff={staff} person={person} />
    </div>
  );
}
