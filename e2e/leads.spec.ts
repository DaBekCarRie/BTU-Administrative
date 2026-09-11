import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("เพิ่มผู้สนใจ", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("กรอกฟอร์มแล้วชื่อโผล่ในรายชื่อ", async ({ page }) => {
    const name = `ทดสอบ ${Date.now()}`;

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("081-234-5678");

    // เลือกคณะแล้วสาขาต้องเปิดให้เลือกตามคณะนั้น
    await page.getByLabel("สาขา").isDisabled();
    await page.getByLabel("คณะ").selectOption({ label: "บริหารธุรกิจ" });
    await page.getByLabel("สาขา").selectOption({ label: "การจัดการโลจิสติกส์" });
    await page.getByLabel("ภาค").selectOption("ทางไกล");
    await page.getByLabel("วุฒิที่ใช้สมัคร").selectOption("ม.6");

    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();

    await expect(page).toHaveURL(/\/leads$/);
    const row = page.getByTestId("lead-rows").locator("tr", { hasText: name });
    await expect(row).toBeVisible();

    // เบอร์ถูกจัดรูปแบบให้เหมือนกันก่อนบันทึก แม้กรอกมามีขีด
    await expect(row).toContainText("081-234-5678");
    await expect(row.locator('a[href="tel:0812345678"]')).toBeVisible();

    await expect(row).toContainText("การจัดการโลจิสติกส์");
    await expect(row).toContainText("ทางไกล");
    await expect(row).toContainText("ใหม่");
  });

  test("แก้ข้อมูลติดต่อแล้วบันทึกเป็นเหตุการณ์ ไม่ใช่เขียนทับ", async ({ page }) => {
    const name = `แก้ไข ${Date.now()}`;

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("0899999999");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await expect(page).toHaveURL(/\/leads$/);

    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]+$/);
    await page.getByRole("link", { name: "แก้ไขข้อมูล" }).click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]+\/edit/);

    // ฟอร์มเติมค่าเดิมมาให้
    await expect(page.getByLabel("เบอร์โทร")).toHaveValue("0899999999");

    await page.getByLabel("เบอร์โทร").fill("0877777777");
    await page.getByLabel("ชื่อเล่น").fill("เล่นใหม่");
    await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();

    await expect(page).toHaveURL(/\/leads$/);
    const row = page.getByTestId("lead-rows").locator("tr", { hasText: name });
    await expect(row).toContainText("087-777-7777");
  });

  test("ทุกช่องประเภทเป็น dropdown ไม่มีช่องพิมพ์อิสระ", async ({ page }) => {
    await page.goto("/leads/new");

    for (const label of [
      "คณะ",
      "สาขา",
      "ภาค",
      "วุฒิที่ใช้สมัคร",
      "เจ้าหน้าที่ผู้ดูแล",
    ]) {
      const field = page.getByLabel(label);
      await expect(field).toHaveJSProperty("tagName", "SELECT");
    }
  });

  test("เบอร์โทรผิดรูปแบบขึ้นข้อความบอก และไม่บันทึก", async ({ page }) => {
    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill("เบอร์พัง");
    await page.getByLabel("เบอร์โทร").fill("123");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();

    await expect(page.getByTestId("lead-error")).toContainText("เบอร์โทรไม่ถูกต้อง");
    await expect(page).toHaveURL(/\/leads\/new/);
  });
});
