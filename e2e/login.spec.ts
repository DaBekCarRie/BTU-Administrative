import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("เข้าสู่ระบบ", () => {
  // ไฟล์นี้ทดสอบการล็อกอินเอง จึงต้องเริ่มจากสถานะยังไม่ล็อกอิน
  test.use({ storageState: { cookies: [], origins: [] } });

  test.skip(
    !EMAIL || !PASSWORD,
    "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD ใน .env.local",
  );

  test("คนที่ยังไม่ล็อกอินถูกส่งไปหน้าเข้าสู่ระบบทุกเส้นทาง", async ({
    page,
  }) => {
    for (const path of ["/", "/queue", "/leads", "/documents"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("ล็อกอินสำเร็จแล้วเห็นชื่อตัวเอง แล้วออกจากระบบได้", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("อีเมล").fill(EMAIL!);
    await page.getByLabel("รหัสผ่าน").fill(PASSWORD!);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page).toHaveURL(/\/queue/);
    await expect(page.getByTestId("current-user")).toBeVisible();

    // เมนูครบทุกหน้า — จำกัดขอบเขตไว้ใน sidebar เพราะกระดานงานก็มีลิงก์ชื่อเดียวกัน
    const nav = page.locator("aside nav");
    for (const label of [
      "คิวโทรวันนี้",
      "ผู้สนใจ",
      "เอกสาร",
      "ศูนย์สอบพิเศษ",
      "คำถามที่พบบ่อย",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/\/login/);

    // ออกแล้วเข้าหน้าในไม่ได้อีก
    await page.goto("/queue");
    await expect(page).toHaveURL(/\/login/);
  });

  test("กด Enter ในช่องรหัสผ่านแล้วส่งฟอร์มได้", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(EMAIL!);
    await page.getByLabel("รหัสผ่าน").fill(PASSWORD!);
    await page.getByLabel("รหัสผ่าน").press("Enter");

    await expect(page).toHaveURL(/\/queue/);
  });

  test("รหัสผ่านผิดขึ้นข้อความบอก และไม่ได้เข้าระบบ", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(EMAIL!);
    await page.getByLabel("รหัสผ่าน").fill("รหัสผ่านผิดแน่นอน");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page.getByTestId("login-error")).toContainText("ไม่ถูกต้อง");
    await expect(page).toHaveURL(/\/login/);
  });
});
