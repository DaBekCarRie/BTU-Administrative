import {
  CALL_OUTCOMES,
  type CallOutcome,
  type DomainEvent,
  type PaymentStatus,
  type PersonDetails,
} from "./events";

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

    case "โทรตาม": {
      const outcome = str(payload.outcome);
      if (!outcome || !(CALL_OUTCOMES as readonly string[]).includes(outcome)) {
        return null;
      }
      return {
        type: "โทรตาม",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          outcome: outcome as CallOutcome,
          note: str(payload.note),
          nextCallAt: str(payload.nextCallAt),
        },
      };
    }

    case "ปิดเคส": {
      const reason = str(payload.reason);
      if (reason !== "ไม่สนใจ" && reason !== "ติดต่อไม่ได้") return null;
      return {
        type: "ปิดเคส",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { reason, note: str(payload.note) },
      };
    }

    case "ยื่นสมัคร": {
      const applicationId = str(payload.applicationId);
      const year = Number(payload.academicYear);
      if (!applicationId || !Number.isFinite(year)) return null;
      return {
        type: "ยื่นสมัคร",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          applicationId,
          academicYear: year,
          facultyId: str(payload.facultyId),
          programId: str(payload.programId),
          studyMode: str(payload.studyMode) as PersonDetails["studyMode"],
        },
      };
    }

    case "ชำระเงิน": {
      const applicationId = str(payload.applicationId);
      const status = str(payload.paymentStatus);
      if (!applicationId || !status) return null;
      return {
        type: "ชำระเงิน",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          applicationId,
          amount: Number(payload.amount) || 0,
          paymentStatus: status as PaymentStatus,
        },
      };
    }

    case "ได้รหัสนักศึกษา": {
      const applicationId = str(payload.applicationId);
      const studentCode = str(payload.studentCode);
      if (!applicationId || !studentCode) return null;
      return {
        type: "ได้รหัสนักศึกษา",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { applicationId, studentCode },
      };
    }

    case "ย้ายเทอม": {
      const year = Number(payload.toAcademicYear);
      if (!Number.isFinite(year)) return null;
      return {
        type: "ย้ายเทอม",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          toAcademicYear: year,
          toTerm: Number(payload.toTerm) || null,
          note: str(payload.note),
        },
      };
    }

    case "ดรอป": {
      return {
        type: "ดรอป",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          reason: str(payload.reason) ?? "",
          creditAmount:
            payload.creditAmount === undefined || payload.creditAmount === null
              ? null
              : Number(payload.creditAmount),
        },
      };
    }

    case "กลับมาเรียน":
      return {
        type: "กลับมาเรียน",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { note: str(payload.note) },
      };

    case "ลาออก":
      return {
        type: "ลาออก",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { reason: str(payload.reason) },
      };

    case "ยืนยันสถานะ": {
      const dimension = str(payload.dimension);
      if (dimension !== "การเรียน" && dimension !== "การเงิน") return null;
      return {
        type: "ยืนยันสถานะ",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { dimension },
      };
    }

    case "ขอศูนย์สอบพิเศษ": {
      const requestId = str(payload.requestId);
      const centerName = str(payload.centerName);
      const year = Number(payload.academicYear);
      if (!requestId || !centerName || !Number.isFinite(year)) return null;
      return {
        type: "ขอศูนย์สอบพิเศษ",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { requestId, academicYear: year, centerName },
      };
    }

    case "ถอนคำขอศูนย์สอบ": {
      const requestId = str(payload.requestId);
      const centerName = str(payload.centerName);
      if (!requestId || !centerName) return null;
      return {
        type: "ถอนคำขอศูนย์สอบ",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: { requestId, centerName },
      };
    }

    case "รวมข้อมูล": {
      const mergedId = str(payload.mergedId);
      if (!mergedId) return null;
      return {
        type: "รวมข้อมูล",
        occurredAt: row.occurred_at,
        sequence: row.id,
        payload: {
          mergedId,
          keep: details(asRecord(payload.keep)),
        },
      };
    }

    default:
      return null;
  }
}
