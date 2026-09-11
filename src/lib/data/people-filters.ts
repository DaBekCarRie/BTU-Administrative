import { Constants } from "@/types/database";

export type PeopleFilters = {
  q: string;
  status: string;
  facultyId: string;
  studyMode: string;
  ownerId: string;
  page: number;
};

export const PAGE_SIZE = 25;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** แปลง query string เป็นตัวกรอง — ค่าที่ไม่รู้จักถูกทิ้ง ไม่ใช่ส่งต่อไปที่ฐานข้อมูล */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): PeopleFilters {
  const status = one(params.status);
  const studyMode = one(params.studyMode);
  const page = Number.parseInt(one(params.page) || "1", 10);

  return {
    q: one(params.q),
    status: (Constants.public.Enums.follow_up_status as readonly string[]).includes(status)
      ? status
      : "",
    facultyId: one(params.facultyId),
    studyMode: (Constants.public.Enums.study_mode as readonly string[]).includes(studyMode)
      ? studyMode
      : "",
    ownerId: one(params.ownerId),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function hasAnyFilter(filters: PeopleFilters): boolean {
  return Boolean(
    filters.q || filters.status || filters.facultyId || filters.studyMode || filters.ownerId,
  );
}

export function toSearchParams(
  filters: Partial<PeopleFilters>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== 1) params.set(key, String(value));
  }
  return params;
}
