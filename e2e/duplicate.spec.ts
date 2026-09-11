import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

async function createLead(
  page: import("@playwright/test").Page,
  name: string,
  phone: string,
) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByLabel("เบอร์โทร").fill(phone);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
}

test.describe("กันข้อมูลซ้ำ", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("กรอกเบอร์ที่มีอยู่แล้วขึ้นเตือน แต่ยังบันทึกต่อได้", async ({ page }) => {
    const stamp = Date.now();
    const phone = `09${String(stamp).slice(-8)}`;
    const first = `พ่อ ${stamp}`;
    const second = `ลูก ${stamp}`;

    await createLead(page, first, phone);

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(second);
    await page.getByLabel("เบอร์โทร").fill(phone);
    await page.getByLabel("ชื่อเล่น").click(); // ทำให้ช่องเบอร์ blur

    const warning = page.getByTestId("duplicate-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(first);

    // เตือนแล้วยังบันทึกได้ — บางเบอร์ใช้ร่วมกันในครอบครัวจริง
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(page.getByRole("link", { name: second })).toBeVisible();
  });

  test("รวมสองรายการแล้วประวัติมาอยู่ในไทม์ไลน์เดียว", async ({ page }) => {
    const stamp = Date.now();
    const phone = `08${String(stamp).slice(-8)}`;
    const keep = `เก็บไว้ ${stamp}`;
    const gone = `รวมเข้า ${stamp}`;

    await createLead(page, gone, phone);
    await createLead(page, keep, phone);

    await page.goto(`/leads?q=${encodeURIComponent(keep)}`);
    await page.getByRole("link", { name: keep }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);

    const before = await page.getByTestId("timeline").locator("li").count();

    await page.getByTestId("find-duplicates").click();
    const item = page.getByTestId("duplicate-list").locator("li", { hasText: gone });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "รวมเข้ามา" }).click();

    // เหตุการณ์ของอีกฝั่ง + เหตุการณ์ "รวมข้อมูล" เข้ามาอยู่ในไทม์ไลน์เดียวกัน
    await expect(page.getByTestId("timeline")).toContainText("รวมข้อมูล");
    await expect(page.getByTestId("timeline").locator("li")).toHaveCount(before + 2);

    // รายการที่ถูกรวมหายไปจากรายชื่อ
    await page.goto("/leads?q=" + encodeURIComponent(gone));
    await expect(page.getByRole("link", { name: gone })).toHaveCount(0);
  });
});
