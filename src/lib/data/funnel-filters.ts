import { Constants, type Enums } from "@/types/database";
import { firstParam } from "@/lib/search-params";

/** เดือนนี้ + ย้อนหลังห้าเดือน = หกเดือน */
export const FUNNEL_HISTORY_MONTHS = 6;

export type FunnelFilters = {
  facultyId: string;
  studyMode: Enums<"study_mode"> | "";
  /** 0 = เดือนนี้ · -1 = เดือนที่แล้ว … -5 */
  monthOffset: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** แปลง query string เป็นตัวกรองกระดานภาพรวม — ค่าที่ไม่รู้จักถูกทิ้ง ไม่ใช่ส่งต่อไปที่ฐานข้อมูล */
export function parseFunnelFilters(
  params: Record<string, string | string[] | undefined>,
): FunnelFilters {
  const facultyId = firstParam(params.faculty);
  const studyMode = firstParam(params.mode);
  const month = Number(firstParam(params.month) || "0");

  return {
    facultyId: UUID.test(facultyId) ? facultyId : "",
    studyMode: (Constants.public.Enums.study_mode as readonly string[]).includes(studyMode)
      ? (studyMode as Enums<"study_mode">)
      : "",
    monthOffset:
      Number.isInteger(month) && month <= 0 && month > -FUNNEL_HISTORY_MONTHS ? month : 0,
  };
}

export function toFunnelSearchParams(filters: FunnelFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.facultyId) params.set("faculty", filters.facultyId);
  if (filters.studyMode) params.set("mode", filters.studyMode);
  if (filters.monthOffset !== 0) params.set("month", String(filters.monthOffset));
  return params;
}
