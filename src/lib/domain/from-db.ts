import type { DomainEvent, PersonDetails } from "./events";

type RawEvent = {
  id: number;
  type: string;
  occurred_at: string;
  payload: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function details(payload: Record<string, unknown>): PersonDetails {
  return {
    fullName: str(payload.fullName) ?? "",
    nickname: str(payload.nickname),
    phone: str(payload.phone),
    lineId: str(payload.lineId),
    facebookName: str(payload.facebookName),
    studyMode: str(payload.studyMode) as PersonDetails["studyMode"],
    facultyId: str(payload.facultyId),
    programId: str(payload.programId),
    priorEducation: str(payload.priorEducation) as PersonDetails["priorEducation"],
    ownerId: str(payload.ownerId),
    note: str(payload.note),
  };
}

/**
 * แถวเหตุการณ์จากฐานข้อมูล → เหตุการณ์ในรูปที่โมดูลโดเมนเข้าใจ
 * คืน null สำหรับชนิดที่โดเมนยังไม่รองรับ (จะทยอยเพิ่มทีละใบงาน)
 */
export function toDomainEvent(row: RawEvent): DomainEvent | null {
  const payload = asRecord(row.payload);

  switch (row.type) {
    case "ติดต่อเข้ามา":
      return {
        type: "ติดต่อเข้ามา",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { ...details(payload), source: str(payload.source) },
      };

    case "แก้ไขข้อมูล": {
      const patch: Partial<PersonDetails> = {};
      for (const [key, value] of Object.entries(payload)) {
        (patch as Record<string, unknown>)[key] =
          typeof value === "string" && value === "" ? null : value;
      }
      return {
        type: "แก้ไขข้อมูล",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: patch,
      };
    }

    default:
      return null;
  }
}
