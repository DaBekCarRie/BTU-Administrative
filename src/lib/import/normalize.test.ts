import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanText,
  collapseThaiDuplicates,
  normalizeFaculty,
  normalizePriorEducation,
  normalizeProgram,
  normalizeStudyMode,
  parseCallDateField,
  parseContactDate,
  parseFollowUp,
  parseThaiDate,
} from "./normalize";

describe("วรรณยุกต์ซ้ำ", () => {
  /** เคสจริง: ชื่อเจ้าหน้าที่ 5 คนกลายเป็น 16 ค่าเพราะวรรณยุกต์ซ้ำที่มองด้วยตาไม่เห็น */
  it.each([
    ["ปุ้้ย", "ปุ้ย"],
    ["ปุ้้้ย", "ปุ้ย"],
    ["ปุ้้้้้้ย", "ปุ้ย"],
    ["ต้้นกล้า", "ต้นกล้า"],
    ["มะลิิ", "มะลิ"],
    ["น้้ำฝน", "น้ำฝน"],
  ])("%s → %s", (input, expected) => {
    expect(collapseThaiDuplicates(input)).toBe(expected);
  });

  it("ไม่แตะคำที่สะกดถูกอยู่แล้ว", () => {
    expect(collapseThaiDuplicates("ปุ้ย")).toBe("ปุ้ย");
    expect(collapseThaiDuplicates("รัฐประศาสนศาสตร์")).toBe("รัฐประศาสนศาสตร์");
  });

  it("cleanText ตัดช่องว่างเกินด้วย", () => {
    expect(cleanText("  ต้้นกล้า   ")).toBe("ต้นกล้า");
    expect(cleanText(null)).toBe("");
  });
});

describe("ยุบชื่อคณะ", () => {
  it.each([
    ["บริหารธุรกิจ", "บริหารธุรกิจ"],
    ["บริหารธุกิจ", "บริหารธุรกิจ"],
    ["บริหารธุรกิิจ", "บริหารธุรกิจ"],
    ["บริิหารธุรกิจ", "บริหารธุรกิจ"],
    ["คณะบริหารธุรกิจ", "บริหารธุรกิจ"],
    ["รััฐศาสตร์", "รัฐศาสตร์"],
    ["ศึกษาศาตร์", "ศึกษาศาสตร์"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeFaculty(input)).toBe(expected);
  });

  it("บริหารการศึกษา เป็นหลักสูตรใต้ศึกษาศาสตร์ ไม่ใช่คณะ", () => {
    expect(normalizeFaculty("บริหารการศึกษา")).toBe("ศึกษาศาสตร์");
    expect(normalizeProgram("บริหารการศึกษา")).toBe("บริหารการศึกษา");
  });

  it("ค่าที่ไม่รู้จักคืน null เพื่อให้ไปอยู่ในรายงาน ไม่ใช่เดามั่ว", () => {
    expect(normalizeFaculty("อะไรสักอย่าง")).toBeNull();
  });
});

describe("ยุบชื่อสาขา", () => {
  it("โลจิสติกส์ทั้งสามแบบยุบเป็นชื่อทางการเดียว", () => {
    expect(normalizeProgram("โลจิสติกส์")).toBe("การจัดการโลจิสติกส์");
    expect(normalizeProgram("การจัดการโลจิสติกส์")).toBe("การจัดการโลจิสติกส์");
    expect(normalizeProgram("การจัดการ/โลจิสติกส์")).toBe("การจัดการโลจิสติกส์");
  });

  it("ตัดคำว่า สาขา / สาขาวิชา นำหน้าออก", () => {
    expect(normalizeProgram("สาขาวิชาการจัดการ")).toBe("การจัดการ");
  });

  it("การจััดการ ที่มีสระซ้ำก็ยุบได้", () => {
    expect(normalizeProgram("การจััดการ")).toBe("การจัดการ");
  });
});

describe("ยุบวุฒิการศึกษา", () => {
  it.each([
    ["ม.6", "ม.6"],
    ["ปวส", "ปวส."],
    ["ปวส.", "ปวส."],
    ["ปวช", "ปวช."],
    ["กศน.ม.6", "กศน.เทียบเท่า ม.6"],
    ["กศน", "กศน.เทียบเท่า ม.6"],
    ["กศน.เทียบ ม.6", "กศน.เทียบเท่า ม.6"],
    ["กศน ม.6", "กศน.เทียบเท่า ม.6"],
    ["ป.ตรี", "ปริญญาตรี"],
    ["ป.ตรีใบที่2", "ปริญญาตรี"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePriorEducation(input)).toBe(expected);
  });
});

describe("ภาคเรียนจากสามคอลัมน์ติ๊ก", () => {
  it("ทางไกลชนะเมื่อมีหลายช่อง", () => {
    expect(normalizeStudyMode("ü", null, "ü")).toBe("ทางไกล");
  });
  it("ไม่ติ๊กเลยคืน null", () => {
    expect(normalizeStudyMode(null, null, null)).toBeNull();
  });
});

describe("แยกสถานะออกจากช่องวันที่", () => {
  /** 1,486 จาก 1,530 แถวในช่องนี้ไม่ใช่วันที่ */
  it.each([
    ["สมัครแล้ว", "สมัครแล้ว"],
    ["ไม่สมัคร", "ไม่สนใจ"],
    ["ไม่่สมัคร", "ไม่สนใจ"],
    ["ไม่ต้องโทร", "ติดต่อไม่ได้"],
    ["ไม่ต้้องโทร", "ติดต่อไม่ได้"],
  ])("%s เป็นสถานะ ไม่ใช่วันที่", (input, expected) => {
    const result = parseCallDateField(input);
    expect(result.kind).toBe("status");
    if (result.kind === "status") expect(result.value).toBe(expected);
  });

  it("วันที่จริงยังถูกอ่านเป็นวันที่", () => {
    const result = parseCallDateField("17/04/2025");
    expect(result.kind).toBe("date");
  });

  it("ข้อความที่แปลไม่ได้ต้องรายงาน ไม่ใช่ทิ้งเงียบ ๆ", () => {
    const result = parseCallDateField("โทรหลังเลิกงาน");
    expect(result.kind).toBe("unknown");
  });
});

describe("แปลงวันที่หลายรูปแบบ", () => {
  it.each([
    ["2024-11-01", "2024-11-01"],
    ["17/04/2025", "2025-04-17"],
    ["13-May-2026", "2026-05-13"],
    ["20/1/2025", "2025-01-20"],
  ])("%s → %s", (input, expected) => {
    expect(parseThaiDate(input)?.slice(0, 10)).toBe(expected);
  });

  it("ปี พ.ศ. ถูกแปลงเป็น ค.ศ.", () => {
    expect(parseThaiDate("2549-06-20")?.slice(0, 10)).toBe("2006-06-20");
  });

  it("ข้อความที่ไม่ใช่วันที่คืน null", () => {
    expect(parseThaiDate("ไม่สมัคร")).toBeNull();
    expect(parseThaiDate("")).toBeNull();
  });
});

describe("แยกช่องติดตามเป็นเหตุการณ์", () => {
  it("ดึงวันที่และผลลัพธ์ออกจากข้อความก้อนเดียว", () => {
    const result = parseFollowUp("ปุ้ยโทร 25/03/2025 สนใจสมัคร");

    expect(result?.occurredAt?.slice(0, 10)).toBe("2025-03-25");
    expect(result?.outcome).toBe("คุยแล้วสนใจ");
    expect(result?.note).toContain("สนใจสมัคร");
  });

  it.each([
    ["20/1/2025 ไม่รับสาย", "ไม่รับสาย"],
    ["27/1/2025 ยังไม่สะดวกสมัคร", "ขอคิดดูก่อน"],
    ["21/1/2025 ขอพิจารณาการผ่อนค่าเทอม", "ขอคิดดูก่อน"],
    ["ได้ที่เรียนใหม่แล้ว", "คุยแล้วไม่สนใจ"],
  ])("%s → %s", (input, expected) => {
    expect(parseFollowUp(input)?.outcome).toBe(expected);
  });

  it("ช่องว่างคืน null", () => {
    expect(parseFollowUp("")).toBeNull();
    expect(parseFollowUp(null)).toBeNull();
  });

  it("ไม่มีวันที่ในข้อความก็ยังอ่านผลลัพธ์ได้", () => {
    const result = parseFollowUp("ไม่รับสาย");
    expect(result?.occurredAt).toBeNull();
    expect(result?.outcome).toBe("ไม่รับสาย");
  });
});

describe("วันที่ในอนาคตไกลเกินจริง", () => {
  /**
   * เจอจริงตอนนำเข้า: ปี พ.ศ. พิมพ์ผิดเป็น 2601 กลายเป็น ค.ศ. 2058
   * 33 แถวหลุดเข้ามาแล้วทำให้การเรียงตามเวลาล่าสุดพังทั้งระบบ
   */
  it("ปฏิเสธวันที่ที่ไกลเกินหนึ่งปีข้างหน้า", () => {
    expect(parseThaiDate("23/01/2601")).toBeNull();
    expect(parseThaiDate("2058-01-23")).toBeNull();
  });

  it("วันที่ในอดีตและอนาคตใกล้ ๆ ยังผ่าน", () => {
    expect(parseThaiDate("2024-11-01")).not.toBeNull();
    expect(parseThaiDate("2569-06-20")).not.toBeNull();
  });

  it("ช่องที่ปฏิเสธไปจะถูกรายงานว่าอ่านไม่ออก", () => {
    expect(parseCallDateField("23/01/2601").kind).toBe("unknown");
  });
});

describe("วันติดต่อเข้ามาที่ยังมาไม่ถึง", () => {
  /**
   * เจอจริง: 26 แถวมีวันติดต่อเข้ามาอยู่หลังวันนำเข้า ไกลสุดเกือบสามเดือน
   * รอดด่านหนึ่งปีมาได้ แล้วไปทำให้ตัวเลข "เดือนนี้" เพี้ยน
   * คนติดต่อเข้ามาในวันที่ยังไม่มาถึงไม่ได้ ต่างจากวันนัดโทรที่ต้องเป็นอนาคต
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("วันที่ในอดีตผ่าน", () => {
    expect(parseContactDate("15/03/2025")).toEqual({
      value: "2025-03-15T05:00:00.000Z",
      rejectedAsFuture: false,
    });
  });

  it("วันนี้ยังผ่าน แม้เวลาที่ตีความจะเลยเวลาปัจจุบันไปแล้ว", () => {
    // เวลาระบบคือ 10:00 น. ไทย ส่วนวันที่ในชีทตีความเป็นเที่ยงวัน
    expect(parseContactDate("12/09/2026")).toEqual({
      value: "2026-09-12T05:00:00.000Z",
      rejectedAsFuture: false,
    });
  });

  it("พรุ่งนี้ถือว่าอนาคตแล้ว — ชีทย้อนหลังไม่มีค่าเผื่อ", () => {
    expect(parseContactDate("13/09/2026")).toEqual({ value: null, rejectedAsFuture: true });
    expect(parseContactDate("11/10/2026").rejectedAsFuture).toBe(true);
  });

  it("ยึดวันตามเวลาไทย ไม่ใช่ UTC", () => {
    // 23:30 น. ไทยของวันที่ 12 = 16:30 UTC — วันที่ 13 ยังเป็นพรุ่งนี้
    vi.setSystemTime(new Date("2026-09-12T16:30:00.000Z"));
    expect(parseContactDate("13/09/2026").rejectedAsFuture).toBe(true);
    // 00:30 น. ไทยของวันที่ 13 = 17:30 UTC ของวันที่ 12 — วันที่ 13 คือวันนี้แล้ว
    vi.setSystemTime(new Date("2026-09-12T17:30:00.000Z"));
    expect(parseContactDate("13/09/2026").rejectedAsFuture).toBe(false);
  });

  it("เลยวันนี้ถือว่าพิมพ์ผิด ทิ้งค่าวันที่และบอกว่าถูกทิ้งเพราะอะไร", () => {
    expect(parseContactDate("02/12/2026")).toEqual({
      value: null,
      rejectedAsFuture: true,
    });
    expect(parseContactDate("2569-12-02")).toEqual({
      value: null,
      rejectedAsFuture: true,
    });
  });

  it("ช่องว่างหรืออ่านไม่ออก ไม่นับว่าถูกทิ้งเพราะอนาคต", () => {
    expect(parseContactDate("")).toEqual({ value: null, rejectedAsFuture: false });
    expect(parseContactDate("ไม่ทราบ")).toEqual({
      value: null,
      rejectedAsFuture: false,
    });
  });

  it("วันนัดโทรในอนาคตไม่โดนด่านนี้", () => {
    expect(parseCallDateField("02-Dec-2026")).toEqual({
      kind: "date",
      value: "2026-12-02T05:00:00.000Z",
    });
  });
});
