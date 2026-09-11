import { Badge } from "@/components/ui/badge";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";

export default async function MasterDataPage() {
  const faculties = await listFacultiesWithPrograms();

  const programCount = faculties.reduce((sum, f) => sum + f.programs.length, 0);

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">ข้อมูลหลัก</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          คณะ {faculties.length} คณะ · สาขา {programCount} สาขา ·
          เรียงตามจำนวนผู้สนใจจริง ตัวที่เลือกบ่อยสุดอยู่บนสุดของ dropdown
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-muted-foreground w-8 px-3 py-2 text-left text-xs font-normal">
                #
              </th>
              <th className="text-muted-foreground w-64 px-3 py-2 text-left text-xs font-normal">
                คณะ
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-normal">
                สาขา
              </th>
            </tr>
          </thead>
          <tbody data-testid="faculty-rows">
            {faculties.map((faculty, index) => (
              <tr key={faculty.id} className="border-b last:border-b-0 align-top">
                <td className="text-muted-foreground px-3 py-3 tabular-nums">
                  {index + 1}
                </td>
                <td className="px-3 py-3 font-medium">
                  {faculty.name}
                  {!faculty.isActive && (
                    <Badge variant="secondary" className="ml-2">
                      ปิดใช้งาน
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-3">
                  {faculty.programs.length === 0 ? (
                    <span className="text-muted-foreground">— ยังไม่มีสาขา</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {faculty.programs.map((program) => (
                        <li key={program.id}>
                          {program.name}
                          {!program.isActive && (
                            <Badge variant="secondary" className="ml-2">
                              ปิดใช้งาน
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground mt-4 max-w-prose text-xs">
        แก้ไขข้อมูลหลักได้เฉพาะหัวหน้าทีม และยังต้องแก้ผ่าน migration
        หน้าจอสำหรับแก้จะทำเมื่อมีความจำเป็นจริง — ข้อมูลชุดนี้แทบไม่เปลี่ยน
      </p>
    </div>
  );
}
