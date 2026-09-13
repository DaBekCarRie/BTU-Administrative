import { expect, test } from "@playwright/test";

import { UPLOAD_DONE, uniqueName } from "./helpers";

const ID = "1234567890123";

async function createPerson(page: import("@playwright/test").Page, name: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await page.goto(`/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
}

test.describe("เลขบัตรประชาชนและร่องรอยการเข้าถึง", () => {
  test("บันทึกแล้วหน้าจอเห็นแค่ 4 ตัวท้าย กดแสดงถึงจะเห็นเลขเต็ม", async ({
    page,
  }) => {
    await createPerson(page, uniqueName("บัตร"));

    await page.getByTestId("edit-national-id").click();
    await page.getByLabel("เลขบัตรประชาชน").fill(ID);
    await page.getByTestId("save-national-id").click();

    const display = page.getByTestId("national-id-display");
    await expect(display).toHaveText("•••••••••0123");
    await expect(display).not.toContainText(ID);

    await page.getByTestId("reveal-national-id").click();
    await expect(display).toHaveText(ID);
  });

  test("เลขไม่ครบ 13 หลักถูกปฏิเสธ", async ({ page }) => {
    await createPerson(page, uniqueName("บัตรสั้น"));

    await page.getByTestId("edit-national-id").click();
    await page.getByLabel("เลขบัตรประชาชน").fill("123");
    await page.getByTestId("save-national-id").click();

    await expect(page.locator("[data-sonner-toast]")).toContainText("13 หลัก");

    // ฟอร์มยังเปิดอยู่ให้แก้ต่อ และต้องไม่มีอะไรถูกบันทึก
    await expect(page.getByLabel("เลขบัตรประชาชน")).toBeVisible();
    await page.getByRole("button", { name: "ยกเลิก" }).click();
    await expect(page.getByTestId("national-id-display")).toHaveText("—");
  });

  test("เปิดดู 1 ครั้ง เกิดร่องรอย 1 รายการ", async ({ page }) => {
    const name = uniqueName("ร่องรอย");
    await createPerson(page, name);

    await page.getByTestId("edit-national-id").click();
    await page.getByLabel("เลขบัตรประชาชน").fill(ID);
    await page.getByTestId("save-national-id").click();
    await expect(page.getByTestId("national-id-display")).toHaveText("•••••••••0123");

    await page.goto("/access-log");
    const before = await page
      .getByTestId("access-log-rows")
      .locator("tr", { hasText: name })
      .filter({ hasText: "เปิดดูเลขบัตรประชาชน" })
      .count();

    await page.goBack();
    await page.getByTestId("reveal-national-id").click();
    await expect(page.getByTestId("national-id-display")).toHaveText(ID);

    await page.goto("/access-log");
    const after = page
      .getByTestId("access-log-rows")
      .locator("tr", { hasText: name })
      .filter({ hasText: "เปิดดูเลขบัตรประชาชน" });

    await expect(after).toHaveCount(before + 1);
    await expect(after.first()).toContainText("ผู้ใช้ทดสอบ E2E");
  });

  test("สำเนาบัตรประชาชนถูกเบลอไว้จนกว่าจะกดแสดง", async ({ page }) => {
    await createPerson(page, uniqueName("เบลอ"));

    await page.getByTestId("file-สำเนาบัตรประชาชน").setInputFiles("e2e/fixtures/doc.png");
    await expect(page.getByTestId("blurred-สำเนาบัตรประชาชน")).toBeVisible(UPLOAD_DONE);

    await page.getByTestId("file-รูปถ่าย").setInputFiles("e2e/fixtures/doc.png");
    await expect(page.getByTestId("doc-รูปถ่าย")).toContainText("ส่งแล้ว", UPLOAD_DONE);
    await expect(page.getByTestId("blurred-รูปถ่าย")).toHaveCount(0);
  });
});
