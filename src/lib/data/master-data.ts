import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProgramOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type FacultyWithPrograms = {
  id: string;
  name: string;
  isActive: boolean;
  programs: ProgramOption[];
};

/**
 * คณะทั้งหมดพร้อมสาขาที่อยู่ใต้แต่ละคณะ
 * เรียงตาม sort_order ซึ่งตั้งตามปริมาณผู้สนใจจริง — ตัวที่เลือกบ่อยสุดอยู่บนสุด
 *
 * ใช้เป็นแหล่งเดียวของ dropdown คณะ/สาขาทุกที่ในระบบ
 */
export async function listFacultiesWithPrograms(options?: {
  activeOnly?: boolean;
}): Promise<FacultyWithPrograms[]> {
  const supabase = await createClient();

  let query = supabase
    .from("faculties")
    .select("id, name, is_active, sort_order, programs(id, name, is_active, sort_order)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, referencedTable: "programs" });

  if (options?.activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(`อ่านข้อมูลคณะไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((faculty) => ({
    id: faculty.id,
    name: faculty.name,
    isActive: faculty.is_active,
    programs: (faculty.programs ?? [])
      .filter((program) => (options?.activeOnly ? program.is_active : true))
      .map((program) => ({
        id: program.id,
        name: program.name,
        isActive: program.is_active,
      })),
  }));
}
