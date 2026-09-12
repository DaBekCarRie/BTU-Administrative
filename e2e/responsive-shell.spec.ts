import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("โครงสร้างส่วนต่อประสานและแถบนำทาง (Responsive App Shell)", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  test.describe("หน้าจอเดสก์ท็อป (Desktop Viewport)", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("Sidebar แสดงผล ย่อ/ขยายได้ และซ่อนแถบมือถือ", async ({ page }) => {
      await page.goto("/queue");

      // Sidebar เดสก์ท็อปต้องแสดง
      const sidebar = page.getByTestId("sidebar");
      await expect(sidebar).toBeVisible();

      // Mobile Header และ Bottom Nav ต้องถูกซ่อนบนเดสก์ท็อป
      await expect(page.getByTestId("mobile-header")).toBeHidden();
      await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();

      // เมนูหน้าปัจจุบันมี aria-current="page"
      const queueNav = page.getByTestId("nav-item-/queue");
      await expect(queueNav).toBeVisible();
      await expect(queueNav).toHaveAttribute("aria-current", "page");

      // แสดงชื่อผู้ใช้ปัจจุบัน
      await expect(page.getByTestId("current-user")).toBeVisible();

      // กดปุ่มย่อเมนู
      const toggleBtn = page.getByTestId("toggle-sidebar");
      await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      await toggleBtn.click();
      await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

      // กดยกเลิกการย่อกลับเป็นปกติ
      await toggleBtn.click();
      await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    });
  });

  test.describe("หน้าจอมือถือ (Mobile Viewport)", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("แสดง Mobile Header, Bottom Nav, และเปิด Drawer ได้", async ({ page }) => {
      await page.goto("/queue");

      // Desktop sidebar ต้องถูกซ่อน
      await expect(page.getByTestId("sidebar")).toBeHidden();

      // Mobile Header และ Bottom Nav ต้องแสดง
      await expect(page.getByTestId("mobile-header")).toBeVisible();
      await expect(page.getByTestId("mobile-header")).toContainText("คิวโทรวันนี้");

      const bottomNav = page.getByTestId("mobile-bottom-nav");
      await expect(bottomNav).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-/queue")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-/leads")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-/documents")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-more")).toBeVisible();

      // เปิด Drawer ผ่านปุ่ม "เพิ่มเติม" บน Bottom Nav
      await page.getByTestId("mobile-bottom-more").click();
      const drawer = page.getByTestId("mobile-drawer");
      await expect(drawer).toBeVisible();
      await expect(drawer).toContainText("BTU Administrative");

      // ปิด Drawer ผ่านปุ่มปิด
      await page.getByTestId("close-drawer").click();
      await expect(drawer).toBeHidden();

      // เปิด Drawer ผ่านปุ่ม Hamburger บน Mobile Header
      await page.getByTestId("open-drawer").click();
      await expect(drawer).toBeVisible();

      // นำทางไปยังหน้าอื่นผ่าน Drawer เช่น ศูนย์สอบพิเศษ
      await drawer.getByRole("link", { name: "ศูนย์สอบพิเศษ" }).click();
      await page.waitForURL(/\/exams/);
      await expect(drawer).toBeHidden();
      await expect(page.getByTestId("mobile-header")).toContainText("ศูนย์สอบพิเศษ");

      // นำทางผ่าน Bottom Nav ไปยังหน้าผู้สนใจ
      await page.getByTestId("mobile-bottom-/leads").click();
      await page.waitForURL(/\/leads/);
      await expect(page.getByTestId("mobile-header")).toContainText("ผู้สนใจ");
    });
  });
});
