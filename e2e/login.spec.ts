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
    // หาจาก testid ของแต่ละเมนู: ชื่อลิงก์มีตัวเลขงานค้างต่อท้าย และ "เอกสาร" เป็นส่วนหนึ่งของ "เอกสารอ้างอิง"
    for (const [href, label] of [
      ["/", "หน้าแรก"],
      ["/queue", "คิวโทรวันนี้"],
      ["/leads", "ผู้สนใจ"],
      ["/documents", "เอกสาร"],
      ["/reference", "เอกสารอ้างอิง"],
      ["/exams", "ศูนย์สอบพิเศษ"],
      ["/faq", "คำถามที่พบบ่อย"],
    ]) {
      const link = nav.getByTestId(`nav-item-${href}`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(label);
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

    // ล็อกอิน → redirect → render คิวโทร ช้ากว่า 5 วินาทีได้ตอนรันขนาน (เหมือนตัวตั้งต้นใน auth.setup)
    await expect(page).toHaveURL(/\/queue/, { timeout: 20_000 });
  });

  test("รหัสผ่านผิดขึ้นข้อความบอก และไม่ได้เข้าระบบ", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(EMAIL!);
    await page.getByLabel("รหัสผ่าน").fill("รหัสผ่านผิดแน่นอน");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page.getByTestId("login-error")).toContainText("ไม่ถูกต้อง");
    await expect(page).toHaveURL(/\/login/);
  });

  test("แสดงปุ่มลงชื่อเข้าใช้ด้วย Google และกดเพื่อเริ่มกระบวนการ OAuth", async ({
    page,
  }) => {
    await page.goto("/login");
    const googleBtn = page.getByRole("button", {
      name: "ลงชื่อเข้าใช้ด้วย Google",
    });
    await expect(googleBtn).toBeVisible();

    await googleBtn.click();
    // หากยังไม่เปิด provider ใน Supabase จะ redirect กลับมาที่ /login?error=oauth_failed หรือหากเปิดแล้วจะ redirect ไป accounts.google.com
    await page.waitForURL(
      (url) =>
        url.hostname.includes("google.com") ||
        (url.pathname === "/login" && url.searchParams.has("error")),
      { timeout: 10000 },
    );
  });
});

