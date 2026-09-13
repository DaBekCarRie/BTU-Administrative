import "server-only";

import type { FunnelFilters } from "@/lib/data/funnel-filters";
import { monthRangeBangkok } from "@/lib/date";
import type { Enums } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

/** ขั้นของกรวย เรียงตามลำดับที่คนเดินผ่าน */
export const FUNNEL_STAGES = [
  { key: "contacted", label: "ติดต่อเข้ามา" },
  { key: "interested", label: "สนใจสมัคร" },
  { key: "applied", label: "ยื่นสมัคร" },
  { key: "paid", label: "ชำระแล้ว" },
  { key: "student_code", label: "ได้รหัสนักศึกษา" },
] as const;

export type FunnelStageKey = (typeof FUNNEL_STAGES)[number]["key"];
export type FunnelCounts = Record<FunnelStageKey, number>;

export type FunnelMonth = { label: string; counts: FunnelCounts };

export type FunnelComparison = { current: FunnelMonth; previous: FunnelMonth };

async function funnelFor(offsetMonths: number, filters: FunnelFilters): Promise<FunnelMonth> {
  const { from, to, label } = monthRangeBangkok(offsetMonths);
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("application_funnel", {
      p_from: from,
      p_to: to,
      p_faculty_id: filters.facultyId || undefined,
      p_study_mode: (filters.studyMode || undefined) as Enums<"study_mode"> | undefined,
    })
    .single();
  if (error) throw new Error(`อ่านกรวยการรับสมัครไม่สำเร็จ: ${error.message}`);

  return {
    label,
    counts: {
      contacted: Number(data.contacted),
      interested: Number(data.interested),
      applied: Number(data.applied),
      paid: Number(data.paid),
      student_code: Number(data.student_code),
    },
  };
}

/**
 * กรวยของเดือนที่เลือกเทียบเดือนก่อนหน้า — นับแบบ cohort ของคนที่ติดต่อเข้ามาในเดือนนั้น
 * ตัวเลขเดี่ยวบอกไม่ได้ว่าดีหรือแย่ ต้องมีของเทียบ
 */
export async function getFunnelComparison(filters: FunnelFilters): Promise<FunnelComparison> {
  const [current, previous] = await Promise.all([
    funnelFor(filters.monthOffset, filters),
    funnelFor(filters.monthOffset - 1, filters),
  ]);
  return { current, previous };
}
