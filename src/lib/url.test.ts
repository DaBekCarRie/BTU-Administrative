import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./url";

describe("safeRedirectPath", () => {
  it("ยอมรับ path ภายในระบบปกติ", () => {
    expect(safeRedirectPath("/queue")).toBe("/queue");
    expect(safeRedirectPath("/leads/123")).toBe("/leads/123");
    expect(safeRedirectPath("/documents?tab=approved")).toBe(
      "/documents?tab=approved",
    );
  });

  it("ใช้ fallback เมื่อส่งค่าว่าง null หรือ undefined", () => {
    expect(safeRedirectPath(undefined)).toBe("/queue");
    expect(safeRedirectPath(null)).toBe("/queue");
    expect(safeRedirectPath("")).toBe("/queue");
    expect(safeRedirectPath("   ")).toBe("/queue");
    expect(safeRedirectPath(null, "/leads")).toBe("/leads");
  });

  it("ป้องกัน protocol-relative open redirect //attacker.com", () => {
    expect(safeRedirectPath("//attacker.com")).toBe("/queue");
    expect(safeRedirectPath("//attacker.com/evil")).toBe("/queue");
    expect(safeRedirectPath("/\\attacker.com")).toBe("/queue");
  });

  it("ป้องกัน URL ภายนอกและ path ที่ไม่ขึ้นต้นด้วย /", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/queue");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/queue");
    expect(safeRedirectPath("queue")).toBe("/queue");
  });
});
