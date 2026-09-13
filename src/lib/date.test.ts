import { afterEach, describe, expect, it, vi } from "vitest";

import { monthRangeBangkok, toDateInputValue } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("toDateInputValue", () => {
  /**
   * บั๊กจริงที่เคยเกิด: ใช้ toISOString().slice(0,10) แล้วช่วงเที่ยงคืนถึง 7 โมงเช้า
   * เวลาไทย UTC ยังเป็นเมื่อวาน ปุ่ม "พรุ่งนี้" จึงให้วันที่ของวันนี้
   */
  it("ตี 1 เวลาไทย (ซึ่ง UTC ยังเป็นเมื่อวาน) ต้องได้วันที่ของไทย", () => {
    vi.useFakeTimers();
    // 2026-09-11T18:00:00Z = 2026-09-12 ตี 1 ที่กรุงเทพ
    vi.setSystemTime(new Date("2026-09-11T18:00:00.000Z"));

    expect(toDateInputValue()).toBe("2026-09-12");
    expect(toDateInputValue(1)).toBe("2026-09-13");
    expect(toDateInputValue(7)).toBe("2026-09-19");
  });

  it("กลางวันเวลาไทยก็ยังถูก", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T07:00:00.000Z")); // บ่าย 2 ที่กรุงเทพ

    expect(toDateInputValue()).toBe("2026-09-12");
    expect(toDateInputValue(1)).toBe("2026-09-13");
  });

  it("ข้ามเดือนได้ถูก", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T18:00:00.000Z")); // 30 ก.ย. ตี 1 ที่กรุงเทพ

    expect(toDateInputValue(1)).toBe("2026-10-01");
  });
});

describe("monthRangeBangkok", () => {
  /**
   * กระดานภาพรวมนับตามเดือนไทย ช่วงเที่ยงคืนถึง 7 โมงเช้า UTC ยังเป็นเดือนก่อน
   * ถ้าคำนวณจาก UTC วันที่ 1 ตอนเช้าตรู่จะได้ตัวเลขของเดือนที่แล้ว
   */
  it("ตี 1 ของวันที่ 1 ตุลาคมเวลาไทย เดือนนี้คือตุลาคม ไม่ใช่กันยายน", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T18:00:00.000Z")); // 1 ต.ค. ตี 1 ที่กรุงเทพ

    expect(monthRangeBangkok()).toEqual({
      from: "2026-09-30T17:00:00.000Z",
      to: "2026-10-31T17:00:00.000Z",
      label: "ต.ค. 2569",
    });
  });

  it("เดือนที่แล้วต่อกันพอดีกับเดือนนี้ ไม่มีช่องว่างหรือทับกัน", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T18:00:00.000Z"));

    const current = monthRangeBangkok();
    const previous = monthRangeBangkok(-1);
    expect(previous).toEqual({
      from: "2026-08-31T17:00:00.000Z",
      to: "2026-09-30T17:00:00.000Z",
      label: "ก.ย. 2569",
    });
    expect(previous.to).toBe(current.from);
  });

  it("ย้อนข้ามปีได้ถูก", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-15T05:00:00.000Z"));

    expect(monthRangeBangkok(-1).label).toBe("ธ.ค. 2569");
    expect(monthRangeBangkok(-1).from).toBe("2026-11-30T17:00:00.000Z");
  });
});
