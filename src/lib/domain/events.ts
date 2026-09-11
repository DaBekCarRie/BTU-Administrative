/**
 * โมดูลโดเมน — หัวใจของ ADR-0001
 *
 * ไฟล์นี้ต้องไม่ import อะไรที่แตะ I/O เลย (ไม่มี supabase ไม่มี fs ไม่มี fetch)
 * เพื่อให้ทดสอบได้โดยไม่ต้องมีฐานข้อมูล และให้ `สถานะปัจจุบัน` สร้างใหม่ได้เสมอ
 *
 * การเพิ่มชนิดเหตุการณ์: เพิ่มสมาชิกใน DomainEvent แล้ว TypeScript จะบังคับให้
 * เขียน handler ใน applyEvent เอง — ลืมไม่ได้
 */

export type FollowUpStatus =
  | "ใหม่"
  | "กำลังติดตาม"
  | "นัดโทรแล้ว"
  | "สนใจสมัคร"
  | "สมัครแล้ว"
  | "ไม่สนใจ"
  | "ติดต่อไม่ได้";

export type EnrollmentStatus =
  | "ยังไม่เริ่ม"
  | "เรียนอยู่"
  | "ดรอป"
  | "ลาออก"
  | "จบแล้ว";

export type PaymentStatus =
  | "ยังไม่ชำระ"
  | "ผ่อนอยู่"
  | "รักษาสภาพ"
  | "ชำระครบ";

export type StudyMode = "ปกติ" | "สมทบ" | "ทางไกล";

export type PriorEducation =
  | "ม.6"
  | "กศน.เทียบเท่า ม.6"
  | "ปวช."
  | "ปวส."
  | "ปริญญาตรี"
  | "อื่นๆ";

/** ข้อมูลที่แก้ได้ด้วยเหตุการณ์ `แก้ไขข้อมูล` */
export type PersonDetails = {
  fullName: string;
  nickname: string | null;
  phone: string | null;
  lineId: string | null;
  facebookName: string | null;
  studyMode: StudyMode | null;
  facultyId: string | null;
  programId: string | null;
  priorEducation: PriorEducation | null;
  ownerId: string | null;
  note: string | null;
};

export const STATUS_DIMENSIONS = ["การเรียน", "การเงิน"] as const;
export type StatusDimension = (typeof STATUS_DIMENSIONS)[number];

export type PersonState = PersonDetails & {
  followUpStatus: FollowUpStatus;
  enrollmentStatus: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  /** ADR-0003: สองมิติข้างล่างเป็นสำเนา ต้องรู้ว่ายืนยันล่าสุดเมื่อไหร่ */
  enrollmentStatusConfirmedAt: string | null;
  paymentStatusConfirmedAt: string | null;
  nextCallAt: string | null;
  /** เงินที่ชำระแล้วแต่ยังไม่ถูกใช้ เกิดจากการดรอปหรือย้ายเทอม — ไม่มีการคืนเงิน */
  creditBalance: number;
  firstContactedAt: string;
  lastEventAt: string;
};

type EventBase = {
  /** เวลาที่เกิดจริง — บันทึกย้อนหลังได้ */
  occurredAt: string;
  /** ตัวตัดสินลำดับเมื่อ occurredAt เท่ากัน (id ที่ฐานข้อมูลออกให้) */
  sequence?: number;
};

/**
 * ชนิดเหตุการณ์ที่ "โดเมนรองรับแล้ว"
 * ฐานข้อมูลประกาศครบ 15 ชนิดตั้งแต่ต้น แต่ TS จะทยอยรับทีละใบงาน
 * เพื่อให้ switch ด้านล่างครบถ้วนเสมอ (exhaustive) ไม่ใช่มี default เงียบ ๆ
 */
export const CALL_OUTCOMES = [
  "ไม่รับสาย",
  "คุยแล้วสนใจ",
  "คุยแล้วไม่สนใจ",
  "ขอคิดดูก่อน",
  "นัดโทรใหม่",
  "สมัครแล้ว",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CLOSE_REASONS = ["ไม่สนใจ", "ติดต่อไม่ได้"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export type DomainEvent =
  | (EventBase & {
      type: "ติดต่อเข้ามา";
      payload: PersonDetails & { source?: string | null };
    })
  | (EventBase & {
      type: "แก้ไขข้อมูล";
      payload: Partial<PersonDetails>;
    })
  | (EventBase & {
      type: "โทรตาม";
      payload: {
        outcome: CallOutcome;
        note?: string | null;
        nextCallAt?: string | null;
      };
    })
  | (EventBase & {
      type: "ปิดเคส";
      payload: { reason: CloseReason; note?: string | null };
    })
  | (EventBase & {
      type: "ยื่นสมัคร";
      payload: {
        applicationId: string;
        academicYear: number;
        facultyId?: string | null;
        programId?: string | null;
        studyMode?: StudyMode | null;
      };
    })
  | (EventBase & {
      type: "ชำระเงิน";
      payload: {
        applicationId: string;
        amount: number;
        /**
         * สถานะการเงินที่ฝ่ายการเงินแจ้งมา — ทีมเป็นแค่คนบันทึกสำเนา (ADR-0003)
         * ระบบคำนวณเองไม่ได้เพราะไม่รู้ยอดค่าเทอมที่แท้จริงของแต่ละหลักสูตร
         */
        paymentStatus: PaymentStatus;
      };
    })
  | (EventBase & {
      type: "ได้รหัสนักศึกษา";
      payload: { applicationId: string; studentCode: string };
    })
  | (EventBase & {
      type: "ย้ายเทอม";
      payload: { toAcademicYear: number; toTerm?: number | null; note?: string | null };
    })
  | (EventBase & {
      type: "ดรอป";
      payload: { reason: string; creditAmount?: number | null };
    })
  | (EventBase & {
      type: "กลับมาเรียน";
      payload: { note?: string | null };
    })
  | (EventBase & {
      type: "ลาออก";
      payload: { reason?: string | null };
    })
  | (EventBase & {
      type: "ยืนยันสถานะ";
      payload: { dimension: StatusDimension };
    })
  | (EventBase & {
      type: "ขอศูนย์สอบพิเศษ";
      payload: { requestId: string; academicYear: number; centerName: string };
    })
  | (EventBase & {
      type: "ถอนคำขอศูนย์สอบ";
      payload: { requestId: string; centerName: string };
    })
  | (EventBase & {
      type: "รวมข้อมูล";
      payload: {
        mergedId: string;
        /**
         * ข้อมูลของรายการที่เหลือรอด ณ เวลาที่รวม
         * ต้องพกมาด้วย ไม่งั้นตอนเล่นเหตุการณ์ซ้ำ `ติดต่อเข้ามา` ของอีกฝั่งซึ่งเก่ากว่า
         * จะมาก่อน แล้วรายการที่เหลือรอดจะถูกเปลี่ยนชื่อเป็นของอีกฝั่ง
         */
        keep?: Partial<PersonDetails>;
      };
    });

/**
 * ผลการโทรกำหนดสถานะการติดตามถัดไป
 * ไม่แตะสถานะการเรียนและสถานะการเงิน — สามมิติเปลี่ยนอิสระต่อกัน (ADR-0002)
 */
const OUTCOME_TO_STATUS: Record<CallOutcome, FollowUpStatus> = {
  ไม่รับสาย: "กำลังติดตาม",
  คุยแล้วสนใจ: "สนใจสมัคร",
  คุยแล้วไม่สนใจ: "ไม่สนใจ",
  ขอคิดดูก่อน: "กำลังติดตาม",
  นัดโทรใหม่: "นัดโทรแล้ว",
  สมัครแล้ว: "สมัครแล้ว",
};

/** สถานะที่ถือว่าจบแล้ว ไม่ต้องโผล่ในคิวโทรอีก */
const CLOSED_STATUSES: ReadonlySet<FollowUpStatus> = new Set([
  "ไม่สนใจ",
  "ติดต่อไม่ได้",
  "สมัครแล้ว",
]);

export function isClosed(status: FollowUpStatus): boolean {
  return CLOSED_STATUSES.has(status);
}

export type DomainEventType = DomainEvent["type"];

function applyDetails(
  base: PersonDetails,
  patch: Partial<PersonDetails>,
): PersonDetails {
  return {
    fullName: patch.fullName ?? base.fullName,
    nickname: patch.nickname !== undefined ? patch.nickname : base.nickname,
    phone: patch.phone !== undefined ? patch.phone : base.phone,
    lineId: patch.lineId !== undefined ? patch.lineId : base.lineId,
    facebookName:
      patch.facebookName !== undefined ? patch.facebookName : base.facebookName,
    studyMode: patch.studyMode !== undefined ? patch.studyMode : base.studyMode,
    facultyId: patch.facultyId !== undefined ? patch.facultyId : base.facultyId,
    programId: patch.programId !== undefined ? patch.programId : base.programId,
    priorEducation:
      patch.priorEducation !== undefined
        ? patch.priorEducation
        : base.priorEducation,
    ownerId: patch.ownerId !== undefined ? patch.ownerId : base.ownerId,
    note: patch.note !== undefined ? patch.note : base.note,
  };
}

function later(a: string, b: string): string {
  return new Date(a) >= new Date(b) ? a : b;
}

/**
 * ฟังก์ชันบริสุทธิ์ — รับสถานะเดิมกับเหตุการณ์ คืนสถานะใหม่
 * ไม่แก้ค่าเดิม (ไม่ mutate) และไม่แตะ I/O
 */
export function applyEvent(
  state: PersonState | null,
  event: DomainEvent,
): PersonState {
  switch (event.type) {
    case "ติดต่อเข้ามา": {
      // `source` เก็บไว้ในเหตุการณ์อย่างเดียว ไม่ขึ้นมาเป็นสถานะปัจจุบัน
      const details: PersonDetails = {
        fullName: event.payload.fullName,
        nickname: event.payload.nickname,
        phone: event.payload.phone,
        lineId: event.payload.lineId,
        facebookName: event.payload.facebookName,
        studyMode: event.payload.studyMode,
        facultyId: event.payload.facultyId,
        programId: event.payload.programId,
        priorEducation: event.payload.priorEducation,
        ownerId: event.payload.ownerId,
        note: event.payload.note,
      };

      // เหตุการณ์นี้เกิดซ้ำได้ (คนเดิมทักกลับมาใหม่) — ครั้งแรกเท่านั้นที่สร้างสถานะ
      if (state) {
        return {
          ...state,
          firstContactedAt: [state.firstContactedAt, event.occurredAt].sort()[0],
          lastEventAt: later(state.lastEventAt, event.occurredAt),
        };
      }

      return {
        ...details,
        followUpStatus: "ใหม่",
        enrollmentStatus: "ยังไม่เริ่ม",
        paymentStatus: "ยังไม่ชำระ",
        enrollmentStatusConfirmedAt: null,
        paymentStatusConfirmedAt: null,
        nextCallAt: null,
        creditBalance: 0,
        firstContactedAt: event.occurredAt,
        lastEventAt: event.occurredAt,
      };
    }

    case "แก้ไขข้อมูล": {
      if (!state) {
        throw new Error(
          "แก้ไขข้อมูลของคนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้",
        );
      }
      return {
        ...state,
        ...applyDetails(state, event.payload),
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "โทรตาม": {
      if (!state) {
        throw new Error("บันทึกผลโทรของคนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      }

      const followUpStatus = OUTCOME_TO_STATUS[event.payload.outcome];

      return {
        ...state,
        followUpStatus,
        // นัดครั้งถัดไปมีความหมายเฉพาะกับคนที่ยังตามอยู่
        nextCallAt: isClosed(followUpStatus)
          ? null
          : (event.payload.nextCallAt ?? null),
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ปิดเคส": {
      if (!state) {
        throw new Error("ปิดเคสของคนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      }

      return {
        ...state,
        followUpStatus: event.payload.reason,
        nextCallAt: null,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ยื่นสมัคร": {
      if (!state) throw new Error("ยื่นสมัครให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        // สิ่งที่สมัครจริงชนะสิ่งที่เคยบอกว่าสนใจ
        facultyId: event.payload.facultyId ?? state.facultyId,
        programId: event.payload.programId ?? state.programId,
        studyMode: event.payload.studyMode ?? state.studyMode,
        followUpStatus: "สมัครแล้ว",
        nextCallAt: null,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ชำระเงิน": {
      if (!state) throw new Error("บันทึกการชำระให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        paymentStatus: event.payload.paymentStatus,
        // ยืนยันล่าสุดคือตอนที่ฝ่ายการเงินแจ้งมา ไม่ใช่ตอนที่กดบันทึก
        paymentStatusConfirmedAt: event.occurredAt,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ได้รหัสนักศึกษา": {
      if (!state) throw new Error("บันทึกรหัสให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        // ได้รหัสจากสำนักทะเบียนแล้ว = เริ่มเป็นนักศึกษา
        // นี่คือสัญญาณที่ใกล้ที่สุดที่ทีมมี เพราะทีมไม่เห็นระบบลงทะเบียนเรียนจริง
        enrollmentStatus: "เรียนอยู่",
        enrollmentStatusConfirmedAt: event.occurredAt,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ย้ายเทอม": {
      if (!state) throw new Error("ย้ายเทอมให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      // ย้ายเทอมไม่เปลี่ยนสถานะทั้งสามมิติ เป็นแค่การเลื่อนรอบที่จะเริ่มเรียน
      return { ...state, lastEventAt: later(state.lastEventAt, event.occurredAt) };
    }

    case "ดรอป": {
      if (!state) throw new Error("ดรอปให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        enrollmentStatus: "ดรอป",
        enrollmentStatusConfirmedAt: event.occurredAt,
        // ค่าเทอมที่จ่ายไปแล้วไม่คืน แต่เก็บเป็นเครดิตไว้ให้ตอนกลับมาเรียน
        creditBalance: event.payload.creditAmount ?? state.creditBalance,
        // สถานะการเงินไม่ขยับ — คนที่ชำระครบแล้วก็ดรอปได้ (ADR-0002)
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "กลับมาเรียน": {
      if (!state) throw new Error("กลับมาเรียนให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        enrollmentStatus: "เรียนอยู่",
        enrollmentStatusConfirmedAt: event.occurredAt,
        // เครดิตถูกใช้ไปกับเทอมที่กลับมาเรียน
        creditBalance: 0,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ลาออก": {
      if (!state) throw new Error("ลาออกให้คนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      return {
        ...state,
        enrollmentStatus: "ลาออก",
        enrollmentStatusConfirmedAt: event.occurredAt,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ยืนยันสถานะ": {
      if (!state) throw new Error("ยืนยันสถานะของคนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      // ค่าสถานะไม่เปลี่ยน เปลี่ยนแค่ "รู้ล่าสุดเมื่อไหร่" (ADR-0003)
      return {
        ...state,
        enrollmentStatusConfirmedAt:
          event.payload.dimension === "การเรียน"
            ? event.occurredAt
            : state.enrollmentStatusConfirmedAt,
        paymentStatusConfirmedAt:
          event.payload.dimension === "การเงิน"
            ? event.occurredAt
            : state.paymentStatusConfirmedAt,
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    case "ขอศูนย์สอบพิเศษ":
    case "ถอนคำขอศูนย์สอบ": {
      if (!state) throw new Error("คำขอศูนย์สอบของคนที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      // ไม่กระทบสถานะทั้งสามมิติ เป็นเรื่องการสอบล้วน ๆ
      return { ...state, lastEventAt: later(state.lastEventAt, event.occurredAt) };
    }

    case "รวมข้อมูล": {
      if (!state) {
        throw new Error("รวมข้อมูลเข้ารายการที่ยังไม่มีเหตุการณ์ `ติดต่อเข้ามา` ไม่ได้");
      }
      return {
        ...state,
        ...applyDetails(state, event.payload.keep ?? {}),
        lastEventAt: later(state.lastEventAt, event.occurredAt),
      };
    }

    default: {
      // ถ้าเพิ่มชนิดใหม่ใน DomainEvent แล้วลืมเขียน handler บรรทัดนี้จะ compile ไม่ผ่าน
      const unreachable: never = event;
      throw new Error(
        `ยังไม่รองรับเหตุการณ์ชนิดนี้: ${JSON.stringify(unreachable)}`,
      );
    }
  }
}

/** เรียงเหตุการณ์ตามเวลาที่เกิดจริง ถ้าเท่ากันใช้ลำดับที่ฐานข้อมูลออกให้ตัดสิน */
export function sortEvents(events: readonly DomainEvent[]): DomainEvent[] {
  return [...events].sort((a, b) => {
    const byTime =
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    if (byTime !== 0) return byTime;
    return (a.sequence ?? 0) - (b.sequence ?? 0);
  });
}

/**
 * สร้างสถานะปัจจุบันใหม่จากเหตุการณ์ทั้งหมด
 * เป็นทั้งเครื่องมือกู้ข้อมูลและเครื่องพิสูจน์ว่า projection ถูกต้อง
 *
 * เหตุการณ์ `ติดต่อเข้ามา` ที่เก่าที่สุดถูกยกมาใส่ก่อนเสมอ เพราะเป็นตัวสร้างสถานะ
 * ถ้าเรียงตามเวลาล้วน ๆ การบันทึก `โทรตาม` ย้อนหลังไปก่อนวันที่ติดต่อ (ซึ่งเกิดขึ้นจริง)
 * จะทำให้เล่นเหตุการณ์ซ้ำแล้วพัง
 */
export function rebuildState(events: readonly DomainEvent[]): PersonState {
  const ordered = sortEvents(events);
  if (ordered.length === 0) {
    throw new Error("สร้างสถานะจากรายการเหตุการณ์ว่างไม่ได้");
  }

  const creationIndex = ordered.findIndex(
    (event) => event.type === "ติดต่อเข้ามา",
  );
  if (creationIndex === -1) {
    throw new Error("ไม่พบเหตุการณ์ `ติดต่อเข้ามา` จึงสร้างสถานะไม่ได้");
  }

  let state = applyEvent(null, ordered[creationIndex]);
  for (const [index, event] of ordered.entries()) {
    if (index === creationIndex) continue;
    state = applyEvent(state, event);
  }
  return state;
}
