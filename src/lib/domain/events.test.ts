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

describe("โทรตาม", () => {
  const base = applyEvent(null, contacted);

  it.each([
    ["ไม่รับสาย", "กำลังติดตาม"],
    ["คุยแล้วสนใจ", "สนใจสมัคร"],
    ["คุยแล้วไม่สนใจ", "ไม่สนใจ"],
    ["ขอคิดดูก่อน", "กำลังติดตาม"],
    ["นัดโทรใหม่", "นัดโทรแล้ว"],
    ["สมัครแล้ว", "สมัครแล้ว"],
  ] as const)("ผล %s ทำให้สถานะติดตามเป็น %s", (outcome, expected) => {
    const next = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome },
    });

    expect(next.followUpStatus).toBe(expected);
  });

  it("เก็บวันนัดโทรครั้งถัดไปไว้", () => {
    const next = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome: "นัดโทรใหม่", nextCallAt: "2026-09-12T03:00:00.000Z" },
    });

    expect(next.nextCallAt).toBe("2026-09-12T03:00:00.000Z");
  });

  it("ผลที่จบแล้วต้องล้างวันนัด ไม่งั้นจะโผล่ในคิวโทรทั้งที่จบไปแล้ว", () => {
    const scheduled = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome: "นัดโทรใหม่", nextCallAt: "2026-09-12T03:00:00.000Z" },
    });

    const done = applyEvent(scheduled, {
      type: "โทรตาม",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: { outcome: "สมัครแล้ว" },
    });

    expect(done.nextCallAt).toBeNull();
  });

  it("ไม่แตะสถานะการเรียนและสถานะการเงิน (ADR-0002)", () => {
    const next = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome: "สมัครแล้ว" },
    });

    expect(next.enrollmentStatus).toBe("ยังไม่เริ่ม");
    expect(next.paymentStatus).toBe("ยังไม่ชำระ");
  });

  it("ไม่แตะข้อมูลติดต่อ", () => {
    const next = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome: "คุยแล้วสนใจ", note: "สนใจภาคทางไกล" },
    });

    expect(next.phone).toBe(base.phone);
    expect(next.fullName).toBe(base.fullName);
  });
});

describe("ปิดเคส", () => {
  const base = applyEvent(null, contacted);

  it.each(["ไม่สนใจ", "ติดต่อไม่ได้"] as const)(
    "ปิดด้วยเหตุผล %s แล้วสถานะเป็นแบบนั้น และล้างวันนัด",
    (reason) => {
      const scheduled = applyEvent(base, {
        type: "โทรตาม",
        occurredAt: "2026-09-05T03:00:00.000Z",
        payload: { outcome: "นัดโทรใหม่", nextCallAt: "2026-09-12T03:00:00.000Z" },
      });

      const closed = applyEvent(scheduled, {
        type: "ปิดเคส",
        occurredAt: "2026-09-07T03:00:00.000Z",
        payload: { reason },
      });

      expect(closed.followUpStatus).toBe(reason);
      expect(closed.nextCallAt).toBeNull();
    },
  );
});

describe("ตามได้ไม่จำกัดจำนวนครั้ง", () => {
  it("โทรตาม 20 ครั้งแล้วยังคำนวณสถานะถูก — ชีทเดิมตันที่ 6", () => {
    const events: DomainEvent[] = [contacted];
    for (let i = 1; i <= 20; i += 1) {
      events.push({
        type: "โทรตาม",
        occurredAt: new Date(Date.UTC(2026, 8, i, 3)).toISOString(),
        sequence: i + 1,
        payload: { outcome: i === 20 ? "คุยแล้วสนใจ" : "ไม่รับสาย" },
      });
    }

    const state = rebuildState(events);
    expect(state.followUpStatus).toBe("สนใจสมัคร");
    expect(state.lastEventAt).toBe(new Date(Date.UTC(2026, 8, 20, 3)).toISOString());
  });
});

describe("รวมข้อมูล", () => {
  const keepDetails: PersonDetails = { ...details, fullName: "รายการที่เก็บไว้" };

  it("ข้อมูลของรายการที่เหลือรอดต้องชนะ แม้เหตุการณ์ของอีกฝั่งจะเก่ากว่า", () => {
    // เหตุการณ์ของอีกฝั่งเกิดก่อน แล้วถูกย้ายมาอยู่กับรายการที่เหลือรอด
    const timeline: DomainEvent[] = [
      {
        type: "ติดต่อเข้ามา",
        occurredAt: "2026-08-01T03:00:00.000Z",
        sequence: 1,
        payload: { ...details, fullName: "รายการที่ถูกรวม" },
      },
      {
        type: "ติดต่อเข้ามา",
        occurredAt: "2026-09-01T03:00:00.000Z",
        sequence: 2,
        payload: keepDetails,
      },
      {
        type: "รวมข้อมูล",
        occurredAt: "2026-09-10T03:00:00.000Z",
        sequence: 3,
        payload: { mergedId: "00000000-0000-0000-0000-000000000001", keep: keepDetails },
      },
    ];

    const state = rebuildState(timeline);

    expect(state.fullName).toBe("รายการที่เก็บไว้");
    // แต่ยังนับวันที่ติดต่อครั้งแรกจากของที่เก่าที่สุด
    expect(state.firstContactedAt).toBe("2026-08-01T03:00:00.000Z");
  });

  it("ประวัติของทั้งสองฝั่งยังอยู่ครบ ไม่มีอะไรหาย", () => {
    const timeline: DomainEvent[] = [
      { ...contacted, occurredAt: "2026-08-01T03:00:00.000Z", sequence: 1 },
      {
        type: "โทรตาม",
        occurredAt: "2026-08-05T03:00:00.000Z",
        sequence: 2,
        payload: { outcome: "ไม่รับสาย" },
      },
      {
        type: "ติดต่อเข้ามา",
        occurredAt: "2026-09-01T03:00:00.000Z",
        sequence: 3,
        payload: keepDetails,
      },
      {
        type: "รวมข้อมูล",
        occurredAt: "2026-09-10T03:00:00.000Z",
        sequence: 4,
        payload: { mergedId: "00000000-0000-0000-0000-000000000001", keep: keepDetails },
      },
    ];

    expect(() => rebuildState(timeline)).not.toThrow();
    expect(rebuildState(timeline).lastEventAt).toBe("2026-09-10T03:00:00.000Z");
  });
});

describe("การสมัคร ชำระเงิน รหัสนักศึกษา", () => {
  const base = applyEvent(null, contacted);
  const applicationId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  it("ยื่นสมัครแล้วสถานะติดตามเป็น สมัครแล้ว และล้างวันนัดโทร", () => {
    const scheduled = applyEvent(base, {
      type: "โทรตาม",
      occurredAt: "2026-09-05T03:00:00.000Z",
      payload: { outcome: "นัดโทรใหม่", nextCallAt: "2026-09-12T03:00:00.000Z" },
    });

    const applied = applyEvent(scheduled, {
      type: "ยื่นสมัคร",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: { applicationId, academicYear: 2569 },
    });

    expect(applied.followUpStatus).toBe("สมัครแล้ว");
    expect(applied.nextCallAt).toBeNull();
  });

  it("หลักสูตรที่สมัครจริงชนะสิ่งที่เคยบอกว่าสนใจ", () => {
    const applied = applyEvent(base, {
      type: "ยื่นสมัคร",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: {
        applicationId,
        academicYear: 2569,
        programId: "99999999-9999-9999-9999-999999999999",
      },
    });

    expect(applied.programId).toBe("99999999-9999-9999-9999-999999999999");
  });

  it("★ ADR-0002: รักษาสภาพ ต้องไม่เปลี่ยนสถานะการเรียน", () => {
    const enrolled = applyEvent(base, {
      type: "ได้รหัสนักศึกษา",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: { applicationId, studentCode: "6914112509" },
    });
    expect(enrolled.enrollmentStatus).toBe("เรียนอยู่");

    const maintained = applyEvent(enrolled, {
      type: "ชำระเงิน",
      occurredAt: "2026-09-07T03:00:00.000Z",
      payload: { applicationId, amount: 3000, paymentStatus: "รักษาสภาพ" },
    });

    expect(maintained.paymentStatus).toBe("รักษาสภาพ");
    expect(maintained.enrollmentStatus).toBe("เรียนอยู่");
  });

  it("วันที่ยืนยันสถานะการเงินคือเวลาที่ฝ่ายการเงินแจ้ง ไม่ใช่เวลาที่กดบันทึก", () => {
    const paid = applyEvent(base, {
      type: "ชำระเงิน",
      occurredAt: "2026-08-20T03:00:00.000Z",
      payload: { applicationId, amount: 500, paymentStatus: "ผ่อนอยู่" },
    });

    expect(paid.paymentStatusConfirmedAt).toBe("2026-08-20T03:00:00.000Z");
  });
});

describe("สถานะการเรียนและเครดิต", () => {
  const applicationId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const enrolled = (() => {
    const base = applyEvent(null, contacted);
    const paid = applyEvent(base, {
      type: "ชำระเงิน",
      occurredAt: "2026-09-02T03:00:00.000Z",
      payload: { applicationId, amount: 26900, paymentStatus: "ชำระครบ" },
    });
    return applyEvent(paid, {
      type: "ได้รหัสนักศึกษา",
      occurredAt: "2026-09-03T03:00:00.000Z",
      payload: { applicationId, studentCode: "6961511427" },
    });
  })();

  it("★ ADR-0002: ดรอป ต้องไม่เปลี่ยนสถานะการเงิน", () => {
    const dropped = applyEvent(enrolled, {
      type: "ดรอป",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: { reason: "ผ่าตัดหัวใจ", creditAmount: 26900 },
    });

    expect(dropped.enrollmentStatus).toBe("ดรอป");
    // จ่ายครบแล้วแต่ดรอป — สถานะการเงินต้องยังเป็นชำระครบ
    expect(dropped.paymentStatus).toBe("ชำระครบ");
  });

  it("ดรอปแล้วเกิดเครดิต กลับมาเรียนแล้วเครดิตถูกใช้", () => {
    const dropped = applyEvent(enrolled, {
      type: "ดรอป",
      occurredAt: "2026-09-06T03:00:00.000Z",
      payload: { reason: "ผ่าตัดหัวใจ", creditAmount: 26900 },
    });
    expect(dropped.creditBalance).toBe(26900);

    const returned = applyEvent(dropped, {
      type: "กลับมาเรียน",
      occurredAt: "2027-01-10T03:00:00.000Z",
      payload: {},
    });

    expect(returned.enrollmentStatus).toBe("เรียนอยู่");
    expect(returned.creditBalance).toBe(0);
  });

  it("ประวัติดรอปยังอยู่ในเหตุการณ์ แม้กลับมาเรียนแล้ว", () => {
    const timeline: DomainEvent[] = [
      contacted,
      {
        type: "ดรอป",
        occurredAt: "2026-09-06T03:00:00.000Z",
        sequence: 2,
        payload: { reason: "ผ่าตัดหัวใจ", creditAmount: 3000 },
      },
      {
        type: "กลับมาเรียน",
        occurredAt: "2027-01-10T03:00:00.000Z",
        sequence: 3,
        payload: {},
      },
    ];

    expect(rebuildState(timeline).enrollmentStatus).toBe("เรียนอยู่");
    expect(timeline.filter((e) => e.type === "ดรอป")).toHaveLength(1);
  });

  it("ย้ายเทอมไม่แตะสถานะทั้งสามมิติ", () => {
    const moved = applyEvent(enrolled, {
      type: "ย้ายเทอม",
      occurredAt: "2026-09-08T03:00:00.000Z",
      payload: { toAcademicYear: 2569, toTerm: 2 },
    });

    expect(moved.enrollmentStatus).toBe(enrolled.enrollmentStatus);
    expect(moved.paymentStatus).toBe(enrolled.paymentStatus);
    expect(moved.followUpStatus).toBe(enrolled.followUpStatus);
  });

  it("ยืนยันสถานะเปลี่ยนแค่วันที่ยืนยัน ไม่เปลี่ยนค่า", () => {
    const confirmed = applyEvent(enrolled, {
      type: "ยืนยันสถานะ",
      occurredAt: "2026-12-01T03:00:00.000Z",
      payload: { dimension: "การเรียน" },
    });

    expect(confirmed.enrollmentStatus).toBe(enrolled.enrollmentStatus);
    expect(confirmed.enrollmentStatusConfirmedAt).toBe("2026-12-01T03:00:00.000Z");
    // ยืนยันมิติเดียว อีกมิติต้องไม่ขยับ
    expect(confirmed.paymentStatusConfirmedAt).toBe(
      enrolled.paymentStatusConfirmedAt,
    );
  });
});

describe("เหตุการณ์ย้อนหลังไปก่อนวันที่ติดต่อเข้ามา", () => {
  /**
   * เกิดขึ้นจริง: เจ้าหน้าที่บันทึกผลโทรย้อนหลังไปไกลกว่าวันที่บันทึกคนเข้าระบบ
   * ถ้าเรียงตามเวลาล้วน ๆ แล้วเล่นซ้ำ จะพังเพราะยังไม่มีสถานะให้ใส่
   */
  it("ยังสร้างสถานะได้ และนับวันติดต่อครั้งแรกจากเหตุการณ์ที่เก่าที่สุด", () => {
    const timeline: DomainEvent[] = [
      { ...contacted, occurredAt: "2026-09-01T03:00:00.000Z", sequence: 1 },
      {
        type: "โทรตาม",
        occurredAt: "2025-01-15T05:00:00.000Z",
        sequence: 2,
        payload: { outcome: "ขอคิดดูก่อน" },
      },
    ];

    const state = rebuildState(timeline);

    expect(state.fullName).toBe("สมฤดี ทักขินัย");
    expect(state.followUpStatus).toBe("กำลังติดตาม");
  });

  it("ไม่มี ติดต่อเข้ามา เลย ต้องโยน error ที่อ่านรู้เรื่อง", () => {
    expect(() =>
      rebuildState([
        {
          type: "โทรตาม",
          occurredAt: "2026-09-05T03:00:00.000Z",
          payload: { outcome: "ไม่รับสาย" },
        },
      ]),
    ).toThrow("ติดต่อเข้ามา");
  });
});
