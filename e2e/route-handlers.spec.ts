import { expect, test } from "@playwright/test";

/**
 * route handler ไม่วิ่งผ่าน layout จึงไม่ได้ด่านเจ้าหน้าที่ที่หน้าจออื่นมี (CLAUDE.md กฎข้อ 8)
 * หน้าส่งออกไฟล์เคยเปิดโล่งเพราะเหตุนี้ — ไฟล์นี้คุมว่าทุก route handler ปฏิเสธคนที่ไม่มีสิทธิ์
 *
 * เคสคนที่ล็อกอินได้แต่ไม่ใช่เจ้าหน้าที่ต้องใช้บัญชีคนนอก ซึ่งจะมาพร้อมใบ 01
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
});
