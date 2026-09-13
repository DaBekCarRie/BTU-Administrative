import { describe, expect, it } from "vitest";

import { FUNNEL_HISTORY_MONTHS, parseFunnelFilters, toFunnelSearchParams } from "./funnel-filters";

const FACULTY = "3f2b8c1e-7a4d-4e9b-9c2a-1d5e6f7a8b9c";

describe("ตัวกรองกระดานภาพรวม", () => {
  it("ไม่มีค่า = ภาพรวมของเดือนนี้", () => {
    expect(parseFunnelFilters({})).toEqual({ facultyId: "", studyMode: "", monthOffset: 0 });
  });

  it("อ่านคณะ ภาค และเดือนย้อนหลังได้", () => {
    expect(parseFunnelFilters({ faculty: FACULTY, mode: "ทางไกล", month: "-3" })).toEqual({
      facultyId: FACULTY,
      studyMode: "ทางไกล",
      monthOffset: -3,
    });
  });

  it("ย้อนได้ไม่เกินหกเดือน และไม่มีเดือนอนาคต", () => {
    expect(FUNNEL_HISTORY_MONTHS).toBe(6);
    expect(parseFunnelFilters({ month: "-5" }).monthOffset).toBe(-5);
    expect(parseFunnelFilters({ month: "-6" }).monthOffset).toBe(0);
    expect(parseFunnelFilters({ month: "1" }).monthOffset).toBe(0);
    expect(parseFunnelFilters({ month: "เมื่อวาน" }).monthOffset).toBe(0);
  });

  it("ค่าที่ไม่รู้จักถูกทิ้ง ไม่ถูกส่งต่อไปฐานข้อมูล", () => {
    expect(parseFunnelFilters({ faculty: "'; drop table people; --", mode: "ออนไลน์" })).toEqual({
      facultyId: "",
      studyMode: "",
      monthOffset: 0,
    });
  });

  it("แปลงกลับเป็น query string โดยไม่ใส่ค่าตั้งต้น", () => {
    expect(toFunnelSearchParams({ facultyId: "", studyMode: "", monthOffset: 0 }).toString()).toBe("");
    expect(
      toFunnelSearchParams({ facultyId: FACULTY, studyMode: "ปกติ", monthOffset: -2 }).toString(),
    ).toBe(new URLSearchParams({ faculty: FACULTY, mode: "ปกติ", month: "-2" }).toString());
  });
});
