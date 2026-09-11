import { describe, expect, it } from "vitest";

import {
  applyEvent,
  rebuildState,
  sortEvents,
  type DomainEvent,
  type PersonDetails,
  type PersonState,
} from "./events";

const details: PersonDetails = {
  fullName: "สมฤดี ทักขินัย",
  nickname: null,
  phone: "0812345678",
  lineId: null,
  facebookName: "Somruedee T",
  studyMode: "ทางไกล",
  facultyId: "11111111-1111-1111-1111-111111111111",
  programId: "22222222-2222-2222-2222-222222222222",
  priorEducation: "ม.6",
  ownerId: null,
  note: null,
};

const contacted: DomainEvent = {
  type: "ติดต่อเข้ามา",
  occurredAt: "2026-09-01T03:00:00.000Z",
  sequence: 1,
  payload: { ...details, source: "Facebook" },
};

describe("ติดต่อเข้ามา", () => {
  it("สร้างสถานะตั้งต้นจากศูนย์", () => {
    const state = applyEvent(null, contacted);

    expect(state.fullName).toBe("สมฤดี ทักขินัย");
    expect(state.facebookName).toBe("Somruedee T");
    expect(state.firstContactedAt).toBe(contacted.occurredAt);
    expect(state.lastEventAt).toBe(contacted.occurredAt);
  });

  it("เริ่มที่สถานะตั้งต้นของทั้งสามมิติ", () => {
    const state = applyEvent(null, contacted);

    expect(state.followUpStatus).toBe("ใหม่");
    expect(state.enrollmentStatus).toBe("ยังไม่เริ่ม");
    expect(state.paymentStatus).toBe("ยังไม่ชำระ");
  });

  it("ยังไม่มีวันที่ยืนยันสถานะ เพราะยังไม่เคยถามหน่วยงานไหน", () => {
    const state = applyEvent(null, contacted);

    expect(state.enrollmentStatusConfirmedAt).toBeNull();
    expect(state.paymentStatusConfirmedAt).toBeNull();
  });

  it("คนเดิมทักกลับมาใหม่ ไม่ทับข้อมูลเดิม แต่เลื่อนเวลาเหตุการณ์ล่าสุด", () => {
    const first = applyEvent(null, contacted);
    const again = applyEvent(first, {
      ...contacted,
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { ...details, fullName: "ชื่อที่พิมพ์ผิด" },
    });

    expect(again.fullName).toBe("สมฤดี ทักขินัย");
    expect(again.firstContactedAt).toBe(contacted.occurredAt);
    expect(again.lastEventAt).toBe("2026-09-05T03:00:00.000Z");
  });
});

describe("แก้ไขข้อมูล", () => {
  const base = applyEvent(null, contacted);

  it("แก้เฉพาะช่องที่ส่งมา ช่องอื่นคงเดิม", () => {
    const next = applyEvent(base, {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-03T03:00:00.000Z",
      payload: { phone: "0998887777" },
    });

    expect(next.phone).toBe("0998887777");
    expect(next.fullName).toBe(base.fullName);
    expect(next.studyMode).toBe(base.studyMode);
  });

  it("ล้างค่าเป็น null ได้ ต่างจากการไม่ส่งช่องนั้นมา", () => {
    const cleared = applyEvent(base, {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-03T03:00:00.000Z",
      payload: { facebookName: null },
    });
    const untouched = applyEvent(base, {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-03T03:00:00.000Z",
      payload: {},
    });

    expect(cleared.facebookName).toBeNull();
    expect(untouched.facebookName).toBe("Somruedee T");
  });

  it("ไม่แตะสถานะทั้งสามมิติ", () => {
    const next = applyEvent(base, {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-03T03:00:00.000Z",
      payload: { note: "ทำงานแล้ว" },
    });

    expect(next.followUpStatus).toBe(base.followUpStatus);
    expect(next.enrollmentStatus).toBe(base.enrollmentStatus);
    expect(next.paymentStatus).toBe(base.paymentStatus);
  });

  it("แก้ข้อมูลของคนที่ยังไม่เคยติดต่อเข้ามา ต้องโยน error", () => {
    expect(() =>
      applyEvent(null, {
        type: "แก้ไขข้อมูล",
        occurredAt: "2026-09-03T03:00:00.000Z",
        payload: { phone: "0812345678" },
      }),
    ).toThrow();
  });
});

describe("ไม่แก้ค่าเดิม", () => {
  it("applyEvent คืนออบเจกต์ใหม่ ไม่ mutate ของเดิม", () => {
    const before = applyEvent(null, contacted);
    const snapshot: PersonState = structuredClone(before);

    applyEvent(before, {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-04T03:00:00.000Z",
      payload: { phone: "0000000000" },
    });

    expect(before).toEqual(snapshot);
  });
});

describe("สร้างสถานะใหม่จากเหตุการณ์ทั้งหมด", () => {
  const timeline: DomainEvent[] = [
    contacted,
    {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-02T03:00:00.000Z",
      sequence: 2,
      payload: { phone: "0998887777" },
    },
    {
      type: "แก้ไขข้อมูล",
      occurredAt: "2026-09-04T03:00:00.000Z",
      sequence: 3,
      payload: { nickname: "ฤดี", note: "สนใจภาคทางไกล" },
    },
  ];

  it("ให้ผลเท่ากับการใส่ทีละเหตุการณ์ตามลำดับ", () => {
    const incremental = timeline.reduce<PersonState | null>(
      (state, event) => applyEvent(state, event),
      null,
    )!;

    expect(rebuildState(timeline)).toEqual(incremental);
  });

  it("เล่นซ้ำกี่ครั้งก็ได้ผลเดิม", () => {
    expect(rebuildState(timeline)).toEqual(rebuildState(timeline));
  });

  it("สลับลำดับที่ส่งเข้ามาแล้วยังได้ผลเดิม เพราะเรียงตามเวลาที่เกิดจริง", () => {
    const shuffled = [timeline[2], timeline[0], timeline[1]];

    expect(rebuildState(shuffled)).toEqual(rebuildState(timeline));
  });

  it("เหตุการณ์ที่บันทึกย้อนหลังเข้าไปแทรกกลาง ไม่ทับของที่เกิดทีหลัง", () => {
    const withBackdated = [
      ...timeline,
      {
        type: "แก้ไขข้อมูล" as const,
        occurredAt: "2026-09-03T03:00:00.000Z",
        sequence: 4,
        payload: { nickname: "ชื่อเล่นเก่า" },
      },
    ];

    // แทรกวันที่ 3 แต่ของวันที่ 4 ต้องยังชนะ
    expect(rebuildState(withBackdated).nickname).toBe("ฤดี");
  });

  it("เวลาเท่ากันใช้ลำดับของฐานข้อมูลตัดสิน", () => {
    const sameInstant: DomainEvent[] = [
      contacted,
      {
        type: "แก้ไขข้อมูล",
        occurredAt: "2026-09-06T03:00:00.000Z",
        sequence: 9,
        payload: { note: "มาทีหลัง" },
      },
      {
        type: "แก้ไขข้อมูล",
        occurredAt: "2026-09-06T03:00:00.000Z",
        sequence: 8,
        payload: { note: "มาก่อน" },
      },
    ];

    expect(rebuildState(sameInstant).note).toBe("มาทีหลัง");
  });

  it("รายการว่างต้องโยน error ไม่ใช่คืนสถานะเปล่า", () => {
    expect(() => rebuildState([])).toThrow();
  });

  it("sortEvents ไม่แก้อาร์เรย์ที่ส่งเข้ามา", () => {
    const input = [timeline[2], timeline[0]];
    const copy = [...input];
    sortEvents(input);

    expect(input).toEqual(copy);
  });
});
