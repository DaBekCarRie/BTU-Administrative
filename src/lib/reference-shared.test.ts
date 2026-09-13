import { describe, expect, it } from "vitest";

import {
  escapeLikePattern,
  isOwnedStoragePath,
  parseReferenceFilters,
  parseReferenceInput,
  REFERENCE_CATEGORIES,
  referenceStoragePath,
} from "./reference-shared";

const DOC = "3f2b8c1e-7a4d-4e9b-9c2a-1d5e6f7a8b9c";
const FILE = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("หมวดของเอกสารอ้างอิง", () => {
  it("เป็นค่าคงที่หกหมวดตามที่ตกลง ห้ามพิมพ์เอง", () => {
    expect([...REFERENCE_CATEGORIES]).toEqual([
      "ตารางสอบ",
      "ปฏิทินการศึกษา",
      "แบบฟอร์ม",
      "ประกาศ",
      "สื่อประชาสัมพันธ์",
      "อื่นๆ",
    ]);
  });
});

describe("ตรวจค่าที่กรอก", () => {
  it("รับหมวด ชื่อเรื่อง และปีการศึกษา พ.ศ.", () => {
    expect(
      parseReferenceInput({ category: "ตารางสอบ", title: "  ตารางสอบภาค 1/2569  ", academicYear: "2569" }),
    ).toEqual({ value: { category: "ตารางสอบ", title: "ตารางสอบภาค 1/2569", academicYear: 2569 } });
  });

  it("ปีการศึกษาว่างได้ — รูปประชาสัมพันธ์ไม่ผูกกับปี", () => {
    expect(parseReferenceInput({ category: "สื่อประชาสัมพันธ์", title: "โปสเตอร์", academicYear: "" })).toEqual({
      value: { category: "สื่อประชาสัมพันธ์", title: "โปสเตอร์", academicYear: null },
    });
  });

  it("หมวดที่ไม่มีในรายการถูกปฏิเสธ", () => {
    expect(parseReferenceInput({ category: "เอกสารลับ", title: "x", academicYear: "" })).toHaveProperty("error");
  });

  it("ต้องมีชื่อเรื่อง และยาวไม่เกิน 200 ตัวอักษร", () => {
    expect(parseReferenceInput({ category: "ประกาศ", title: "   ", academicYear: "" })).toHaveProperty("error");
    expect(parseReferenceInput({ category: "ประกาศ", title: "ก".repeat(201), academicYear: "" })).toHaveProperty("error");
  });

  it("ปีต้องเป็น พ.ศ. — กรอก ค.ศ. มาถูกปฏิเสธพร้อมบอกเหตุผล", () => {
    const result = parseReferenceInput({ category: "ตารางสอบ", title: "x", academicYear: "2026" });
    expect(result).toHaveProperty("error");
    expect("error" in result && result.error).toContain("พ.ศ.");
  });
});

describe("path ใน storage", () => {
  it("เป็นอักษรอังกฤษเสมอ เพราะ Supabase ไม่รับภาษาไทย และอยู่ใต้โฟลเดอร์ของรายการ", () => {
    expect(referenceStoragePath(DOC, FILE, "application/pdf")).toBe(`${DOC}/${FILE}.pdf`);
    expect(referenceStoragePath(DOC, FILE, "image/jpeg")).toBe(`${DOC}/${FILE}.jpg`);
  });

  it("ชนิดไฟล์ที่ bucket ไม่รับ ไม่ได้ path", () => {
    expect(referenceStoragePath(DOC, FILE, "application/vnd.ms-excel")).toBeNull();
  });

  it("บันทึกไฟล์ได้เฉพาะ path ใต้โฟลเดอร์ของรายการนั้นเอง", () => {
    expect(isOwnedStoragePath(DOC, `${DOC}/${FILE}.png`)).toBe(true);
    expect(isOwnedStoragePath(DOC, `${FILE}/${FILE}.png`)).toBe(false);
    expect(isOwnedStoragePath(DOC, `${DOC}/../people/x.png`)).toBe(false);
  });
});

describe("ตัวกรองเอกสารอ้างอิง", () => {
  it("ไม่มีค่า = ทั้งหมด", () => {
    expect(parseReferenceFilters({})).toEqual({ q: "", category: "", year: "" });
  });

  it("อ่านคำค้น หมวด และปีได้ รวมถึง 'ไม่ผูกกับปี'", () => {
    expect(parseReferenceFilters({ q: "  ตาราง  ", category: "ตารางสอบ", year: "2569" })).toEqual({
      q: "ตาราง",
      category: "ตารางสอบ",
      year: "2569",
    });
    expect(parseReferenceFilters({ year: "none" }).year).toBe("none");
  });

  it("ค่าที่ไม่รู้จักถูกทิ้ง", () => {
    expect(parseReferenceFilters({ category: "ลับ", year: "2026" })).toEqual({ q: "", category: "", year: "" });
  });

  it("คำค้นยาวเกินถูกตัด ไม่ส่งข้อความยาว ๆ ไปฐานข้อมูล", () => {
    expect(parseReferenceFilters({ q: "ก".repeat(500) }).q).toHaveLength(100);
  });

  it("อักขระพิเศษของ LIKE ถูก escape — ค้น 50% ต้องหา 50% ไม่ใช่ทุกอย่างที่ขึ้นต้นด้วย 50", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
