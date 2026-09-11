import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

/** คำตอบที่ไม่ได้ยืนยันเกินนี้ถือว่าควรยืนยันใหม่ — กฎมหาวิทยาลัยเปลี่ยนบ่อย */
export const STALE_AFTER_DAYS = 90;

export type AnswerItem = {
  id: string;
  question: string;
  answer: string;
  visibility: Enums<"answer_visibility">;
  source: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  isStale: boolean;
};

function isStale(confirmedAt: string | null): boolean {
  if (!confirmedAt) return true;
  const age = Date.now() - new Date(confirmedAt).getTime();
  return age > STALE_AFTER_DAYS * 86_400_000;
}

export type AnswerFilters = { q: string; visibility: string };

export async function listAnswers(
  filters: AnswerFilters,
): Promise<AnswerItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("answers")
    .select("id, question, answer, visibility, source, confirmed_at, staff ( display_name )")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.q) {
    const term = filters.q.replace(/[%_\\]/g, (m) => `\\${m}`);
    query = query.or(`question.ilike.%${term}%,answer.ilike.%${term}%`);
  }
  if (filters.visibility) {
    query = query.eq(
      "visibility",
      filters.visibility as Enums<"answer_visibility">,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`อ่านคลังคำตอบไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    visibility: row.visibility,
    source: row.source,
    confirmedAt: row.confirmed_at,
    confirmedByName: row.staff?.display_name ?? null,
    isStale: isStale(row.confirmed_at),
  }));
}
