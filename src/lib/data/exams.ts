import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export { KNOWN_CENTERS } from "@/lib/exams-shared";

export type ExamRequest = {
  id: string;
  personId: string;
  personName: string;
  programName: string | null;
  studyMode: Enums<"study_mode"> | null;
  academicYear: number;
  centerName: string;
  status: Enums<"exam_request_status">;
};

export async function listExamRequests(
  academicYear?: number,
): Promise<ExamRequest[]> {
  const supabase = await createClient();

  let query = supabase
    .from("exam_center_requests")
    .select("id, person_id, academic_year, center_name, status, people ( full_name, study_mode, programs ( name ) )")
    .order("center_name")
    .order("created_at");

  if (academicYear) query = query.eq("academic_year", academicYear);

  const { data, error } = await query;
  if (error) throw new Error(`อ่านคำขอศูนย์สอบไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    personId: row.person_id,
    personName: row.people?.full_name ?? "—",
    programName: row.people?.programs?.name ?? null,
    studyMode: row.people?.study_mode ?? null,
    academicYear: row.academic_year,
    centerName: row.center_name,
    status: row.status,
  }));
}

export async function listRequestsForPerson(
  personId: string,
): Promise<ExamRequest[]> {
  return (await listExamRequests()).filter((r) => r.personId === personId);
}

/** จัดกลุ่มตามศูนย์ สำหรับหน้าสรุปและปุ่มคัดลอกรายชื่อ */
export function groupByCenter(
  requests: ExamRequest[],
): { centerName: string; members: ExamRequest[] }[] {
  const groups = new Map<string, ExamRequest[]>();
  for (const request of requests) {
    if (request.status === "ถอนแล้ว") continue;
    groups.set(request.centerName, [
      ...(groups.get(request.centerName) ?? []),
      request,
    ]);
  }
  return [...groups.entries()]
    .map(([centerName, members]) => ({ centerName, members }))
    .sort((a, b) => a.centerName.localeCompare(b.centerName, "th"));
}
