import { expect, test } from "@playwright/test";

import { hasCredentials, STORAGE } from "./identities";

/**
 * route handler ไม่วิ่งผ่าน layout จึงไม่ได้ด่านเจ้าหน้าที่ที่หน้าจออื่นมี (CLAUDE.md กฎข้อ 8)
 * หน้าส่งออกไฟล์เคยเปิดโล่งเพราะเหตุนี้ — ไฟล์นี้คุมว่าทุก route handler ปฏิเสธคนที่ไม่มีสิทธิ์
 *
 * รวมเคสคนที่ล็อกอินได้แต่ไม่ใช่เจ้าหน้าที่ — ใช้บัญชีคนนอกจาก `npm run e2e:accounts`
 */
test.describe("ด่านของ route handler", () => {
  test("เจ้าหน้าที่ส่งออกรายชื่อเป็นไฟล์ได้", async ({ page }) => {
    const response = await page.request.get("/leads/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(await response.text()).toContain("เบอร์โทร");
  });

  test.describe("คนที่ยังไม่ล็อกอิน", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("ส่งออกไฟล์ไม่ได้ ได้แต่ถูกส่งไปหน้าเข้าสู่ระบบ", async ({ page }) => {
      const response = await page.request.get("/leads/export", { maxRedirects: 0 });
      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(response.headers()["location"]).toContain("/login");
      expect(await response.text()).not.toContain("เบอร์โทร");
    });

    test("สรุปงานประจำวันปฏิเสธคำขอที่ไม่มี secret", async ({ page }) => {
      const response = await page.request.get("/api/cron/daily-digest", { maxRedirects: 0 });
      // middleware ส่งไปหน้าเข้าสู่ระบบก่อน หรือ route ปฏิเสธเอง — ห้ามได้ 200
      expect(response.status()).not.toBe(200);
    });
  });

  test.describe("เจ้าหน้าที่ที่ไม่ใช่หัวหน้าทีม", () => {
    test.skip(!hasCredentials("staff"), "รัน npm run e2e:accounts ก่อน");
    test.use({ storageState: STORAGE.staff });

    test("ส่งออกรายชื่อได้ — ด่านคือเป็นเจ้าหน้าที่ ไม่ใช่เป็นหัวหน้าทีม", async ({ page }) => {
      const response = await page.request.get("/leads/export");
      expect(response.status()).toBe(200);
    });
  });

  test.describe("คนนอกทีม (ล็อกอินได้แต่ไม่มีแถวเจ้าหน้าที่)", () => {
    test.skip(!hasCredentials("outsider"), "รัน npm run e2e:accounts ก่อน");
    test.use({ storageState: STORAGE.outsider });

    test("ถูกเตะออกจากทุกหน้าจอ พร้อมบอกว่ายังไม่มีสิทธิ์", async ({ page }) => {
      for (const path of ["/", "/queue", "/leads", "/documents", "/reference"]) {
        // เคยวน redirect ไม่รู้จบระหว่างหน้าเข้าสู่ระบบกับ layout — goto จะพังด้วย ERR_TOO_MANY_REDIRECTS
        await page.goto(path);
        await expect(page).toHaveURL(/\/login\?error=no-staff/);
        await expect(page.getByText("ยังไม่ได้รับสิทธิ์เจ้าหน้าที่")).toBeVisible();
        await expect(page.getByTestId("no-access")).toBeVisible();
      }
    });

    test("ส่งออกรายชื่อไม่ได้ ได้ 403 ไม่ใช่ไฟล์ว่าง", async ({ page }) => {
      const response = await page.request.get("/leads/export", { maxRedirects: 0 });
      expect(response.status()).toBe(403);
      expect(await response.text()).not.toContain("เบอร์โทร");
    });
  });
});
