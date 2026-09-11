import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("ข้อมูลหลักคณะและสาขา", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD ใน .env.local",
  );

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("เปิดจากเมนูแล้วเห็นคณะครบพร้อมสาขาที่อยู่ใต้แต่ละคณะ", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "ข้อมูลหลัก (คณะ/สาขา)" }).click();
    await expect(page).toHaveURL(/\/master-data/);

    // คณะครบทุกคณะที่ seed ไว้
    const rows = page.getByTestId("faculty-rows").locator("tr");
    await expect(rows).toHaveCount(11);

    // คณะที่มีผู้สนใจมากสุดต้องอยู่แถวแรก เพราะ dropdown จะเรียงแบบเดียวกัน
    await expect(rows.first()).toContainText("บริหารธุรกิจ");

    // สาขาแสดงอยู่ใต้คณะที่ถูกต้อง
    await expect(rows.first()).toContainText("การจัดการ");
    await expect(rows.first()).toContainText("การจัดการโลจิสติกส์");

    await expect(
      rows.filter({ hasText: "รัฐศาสตร์" }).first(),
    ).toContainText("รัฐประศาสนศาสตร์");
  });

  test("คนที่ยังไม่ล็อกอินเปิดหน้าข้อมูลหลักไม่ได้", async ({ browser }) => {
    const anon = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await anon.newPage();
    await page.goto("/master-data");
    await expect(page).toHaveURL(/\/login/);
    await anon.close();
  });
});
