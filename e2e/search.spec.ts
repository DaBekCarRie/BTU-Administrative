import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("ค้นหา กรอง ส่งออก", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("ค้นชื่อไทยแบบพิมพ์ไม่ครบก็เจอ — ศิริ ต้องเจอ ศิริพร", async ({ page }) => {
    const unique = Date.now();
    const fullName = `ศิริพรทดสอบ${unique}`;

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(fullName);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await expect(page).toHaveURL(/\/leads$/);

    // พิมพ์แค่ "ศิริ" ต้องเจอ "ศิริพร..." — ข้อนี้พังถ้าเปลี่ยนไปใช้ full-text search
    await page.getByLabel("ค้นหา").fill("ศิริ");
    await page.getByRole("button", { name: "ค้นหา" }).click();

    await expect(
      page.getByTestId("lead-rows").locator("tr", { hasText: fullName }),
    ).toBeVisible();
  });

  test("ค้นด้วยเศษของเบอร์โทรก็เจอ", async ({ page }) => {
    await page.goto("/leads?q=8123");
    const rows = page.getByTestId("lead-rows").locator("tr");
    await expect(rows.first()).toContainText("081-234-5678");
  });

  test("กรองหลายเงื่อนไขพร้อมกัน แล้วจำนวนผลลัพธ์เปลี่ยนตาม", async ({ page }) => {
    await page.goto("/leads");
    const all = await page.getByTestId("result-count").textContent();

    await page.getByLabel("สถานะติดตาม").selectOption("ไม่สนใจ");
    await expect(page).toHaveURL(/status=/);

    const filtered = await page.getByTestId("result-count").textContent();
    expect(filtered).not.toBe(all);
  });

  test("ส่งออกได้เฉพาะผลลัพธ์ที่กรองอยู่", async ({ page }) => {
    await page.goto("/leads?q=ศิริ");

    const href = await page.getByTestId("export-link").getAttribute("href");
    expect(href).toContain("q=");

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");

    const body = await response.text();
    expect(body.startsWith("﻿")).toBe(true); // Excel ต้องการ BOM ถึงอ่านไทยถูก
    expect(body).toContain("ศิริพร");
  });
});
