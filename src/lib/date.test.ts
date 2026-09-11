import { afterEach, describe, expect, it, vi } from "vitest";

import { toDateInputValue } from "./date";

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
