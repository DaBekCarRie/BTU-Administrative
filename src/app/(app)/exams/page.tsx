import Link from "next/link";

import { groupByCenter, listExamRequests } from "@/lib/data/exams";
import { CopyListButton } from "./copy-button";

export default async function ExamsPage({ searchParams }: PageProps<"/exams">) {
  const params = await searchParams;
  const year = Number(typeof params.year === "string" ? params.year : "");

  const requests = await listExamRequests(
    Number.isInteger(year) ? year : undefined,
  );
  const centers = groupByCenter(requests);
  const total = centers.reduce((sum, group) => sum + group.members.length, 0);

  return (
    <div className="p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">ศูนย์สอบพิเศษ</h1>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="exam-summary">
          {total} คน · {centers.length} ศูนย์
        </p>
      </header>

      <div
        role="note"
        className="mb-5 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
      >
        รายชื่อนี้<strong>ไม่ได้ซิงก์</strong>กับระบบลงทะเบียนสอบของมหาวิทยาลัย
        ต้องเข้าไปเช็กที่ระบบนั้นเองว่านักศึกษาลงวันสอบไว้ตรงกันหรือยัง
      </div>

      {centers.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ยังไม่มีคำขอศูนย์สอบพิเศษ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5" data-testid="center-groups">
          {centers.map((group) => (
            <section key={group.centerName} className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-medium">
                  ศูนย์{group.centerName}
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    {group.members.length} คน
                  </span>
                </h2>
                <CopyListButton
                  centerName={group.centerName}
                  lines={group.members.map(
                    (member) =>
                      `${member.personName}${member.programName ? ` ${member.programName}` : ""}${member.studyMode ? ` (${member.studyMode})` : ""}`,
                  )}
                />
              </div>

              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                {group.members.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/leads/${member.personId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {member.personName}
                    </Link>
                    {member.programName ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {member.programName}
                      </span>
                    ) : null}
                    {member.studyMode ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {member.studyMode}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground"> · {member.academicYear}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
