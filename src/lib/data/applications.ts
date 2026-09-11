import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatThaiDate } from "@/lib/date";
import type { Enums } from "@/types/database";

export type PaymentRow = {
  id: string;
  amount: number;
  paidAt: string;
  receiptNo: string | null;
  note: string | null;
};

export type ApplicationRow = {
  id: string;
  academicYear: number;
  term: number | null;
  studentCode: string | null;
  status: Enums<"application_status">;
  studyMode: Enums<"study_mode"> | null;
  facultyName: string | null;
  programName: string | null;
  payments: PaymentRow[];
  totalPaid: number;
};

export async function listApplications(
  personId: string,
): Promise<ApplicationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, academic_year, term, student_code, status, study_mode,
       faculties ( name ), programs ( name ),
       payments ( id, amount, paid_at, receipt_no, note )`,
    )
    .eq("person_id", personId)
    .order("academic_year", { ascending: false });

  if (error) throw new Error(`อ่านการสมัครไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => {
    const payments = (row.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paidAt: payment.paid_at,
      receiptNo: payment.receipt_no,
      note: payment.note,
    }));

    return {
      id: row.id,
      academicYear: row.academic_year,
      term: row.term,
      studentCode: row.student_code,
      status: row.status,
      studyMode: row.study_mode,
      facultyName: row.faculties?.name ?? null,
      programName: row.programs?.name ?? null,
      payments: payments.sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
      totalPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
    };
  });
}

/** ป้ายชื่อการสมัครสำหรับแสดงในไทม์ไลน์ */
export function applicationLabel(row: {
  academicYear: number;
  programName: string | null;
}): string {
  return `${row.programName ?? "ยังไม่ระบุหลักสูตร"} ${row.academicYear}`;
}

export { formatThaiDate };
