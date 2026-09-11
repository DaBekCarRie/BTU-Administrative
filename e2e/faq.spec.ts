import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

test.describe("คลังคำตอบ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/faq");
  });

  test("มีคำถามตั้งต้นจากที่ทีมเคยถามจริง พร้อมป้ายว่าใช้ตอบใครได้", async ({
    page,
  }) => {
    const list = page.getByTestId("answer-list");

    const cardBatCard = list.locator("li", { hasText: "บัตรนักศึกษาแบบแข็ง" });
    await expect(cardBatCard).toBeVisible();
    // เรื่องที่ยังไม่ชัด ต้องไม่ถูกเอาไปตอบผู้สนใจ
    await expect(cardBatCard).toContainText("ใช้ภายในเท่านั้น");

    const cardLoan = list.locator("li", { hasText: "กู้ กยศ. ไม่ผ่าน" });
    await expect(cardLoan).toContainText("ตอบผู้สนใจได้");
    await expect(cardLoan).toContainText("รักษาสภาพไม่ได้แปลว่าหยุดเรียน");
  });

  test("คำตอบที่ยังไม่เคยยืนยันขึ้นป้ายเตือน", async ({ page }) => {
    // ใช้ข้อที่ไม่มีเทสต์ไหนไปกดยืนยัน เพื่อไม่ให้ผลขึ้นกับลำดับการรัน
    const card = page
      .getByTestId("answer-list")
      .locator("li", { hasText: "บัตรนักศึกษาแบบแข็ง" });

    await expect(card).toContainText("ควรยืนยันใหม่");
    await expect(card).toContainText("ยังไม่เคยยืนยัน");
  });

  test("กดยืนยันแล้ววันที่และชื่อผู้ยืนยันอัปเดต", async ({ page }) => {
    const question = uniqueName("ยืนยันทดสอบ");

    await page.getByTestId("add-answer").click();
    const dialog = page.getByRole("dialog", { name: "เพิ่มคำถาม" });
    await dialog.getByLabel("คำถาม", { exact: true }).fill(question);
    await dialog.getByLabel("คำตอบ", { exact: true }).fill("คำตอบ");
    await page.getByTestId("submit-answer").click();

    const card = page.getByTestId("answer-list").locator("li", { hasText: question });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "ยืนยันว่ายังถูกต้อง" }).click();

    await expect(card).toContainText("ยืนยันล่าสุด");
    await expect(card).toContainText("ผู้ใช้ทดสอบ E2E");
    await expect(card).not.toContainText("ควรยืนยันใหม่");
  });

  test("ค้นหาภาษาไทยแบบพิมพ์ไม่ครบก็เจอ", async ({ page }) => {
    await page.getByLabel("ค้นหา").fill("กยศ");
    await page.getByRole("button", { name: "ค้นหา" }).click();

    const items = page.getByTestId("answer-list").locator("li");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("กู้ กยศ. ไม่ผ่าน");
  });

  test("กรองเฉพาะคำตอบที่ใช้ภายในได้", async ({ page }) => {
    await page.getByLabel("ใช้ตอบใคร").selectOption("ใช้ภายในเท่านั้น");

    const items = page.getByTestId("answer-list").locator("li");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("บัตรนักศึกษาแบบแข็ง");
  });

  test("เพิ่มคำถามใหม่แล้วถือว่ายืนยันแล้ววันนี้", async ({ page }) => {
    const question = uniqueName("คำถามทดสอบ");

    await page.getByTestId("add-answer").click();
    // จำกัดขอบเขตไว้ในกล่อง เพราะชื่อ dialog เองก็ตรงกับคำว่า "เพิ่มคำถาม"
    const dialog = page.getByRole("dialog", { name: "เพิ่มคำถาม" });
    await dialog.getByLabel("คำถาม", { exact: true }).fill(question);
    await dialog.getByLabel("คำตอบ", { exact: true }).fill("คำตอบสำหรับทดสอบ");
    await dialog.getByLabel("ที่มาของคำตอบ").fill("ทดสอบอัตโนมัติ");
    await page.getByTestId("submit-answer").click();

    const card = page.getByTestId("answer-list").locator("li", { hasText: question });
    await expect(card).toBeVisible();
    await expect(card).toContainText("ยืนยันล่าสุด");
    await expect(card).not.toContainText("ควรยืนยันใหม่");
  });
});
