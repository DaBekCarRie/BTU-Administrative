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

export type PersonState = PersonDetails & {
  followUpStatus: FollowUpStatus;
  enrollmentStatus: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  /** ADR-0003: สองมิติข้างล่างเป็นสำเนา ต้องรู้ว่ายืนยันล่าสุดเมื่อไหร่ */
  enrollmentStatusConfirmedAt: string | null;
  paymentStatusConfirmedAt: string | null;
  nextCallAt: string | null;
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
export type DomainEvent =
  | (EventBase & {
      type: "ติดต่อเข้ามา";
      payload: PersonDetails & { source?: string | null };
    })
  | (EventBase & {
      type: "แก้ไขข้อมูล";
      payload: Partial<PersonDetails>;
    });

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
 */
export function rebuildState(events: readonly DomainEvent[]): PersonState {
  const ordered = sortEvents(events);
  if (ordered.length === 0) {
    throw new Error("สร้างสถานะจากรายการเหตุการณ์ว่างไม่ได้");
  }

  let state: PersonState | null = null;
  for (const event of ordered) {
    state = applyEvent(state, event);
  }
  return state as PersonState;
}
