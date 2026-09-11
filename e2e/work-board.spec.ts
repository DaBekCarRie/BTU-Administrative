import { expect, test } from "@playwright/test";

test.describe("กระดานงานค้างและตัวเลขรวม", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("แสดงงานค้างครบทุกประเภท และกดแล้วไปหน้าที่กรองไว้", async ({ page }) => {
    const board = page.getByTestId("work-board");

    for (const label of [
      "ไม่มีใครแตะ",
      "รอรหัสนักศึกษา",
      "เอกสารไม่ครบ",
      "คิวโทรวันนี้",
    ]) {
      await expect(board.getByTestId(`tile-${label}`)).toBeVisible();
    }

    await board.getByTestId("tile-เอกสารไม่ครบ").click();
    await expect(page).toHaveURL(/\/documents/);

    await page.goto("/queue");
    await page.getByTestId("tile-ไม่มีใครแตะ").click();
    // ไปหน้ารายชื่อที่กรองไว้แล้ว ไม่ใช่หน้าเปล่า
    await expect(page).toHaveURL(/\/leads\?status=/);
  });

  test("แถบตัวเลขรวมบอก สมัครเดือนนี้ เรียนอยู่ ดรอป", async ({ page }) => {
    const strip = page.getByTestId("totals-strip");

    await expect(strip).toContainText("เดือนนี้สมัคร");
    await expect(strip).toContainText("เรียนอยู่");
    await expect(strip).toContainText("ดรอป");
  });

  test("ไม่มีตัวเลขแยกรายบุคคลของเจ้าหน้าที่บนหน้านี้", async ({ page }) => {
    const board = page.getByTestId("work-board");
    const text = await board.innerText();

    // ชื่อเจ้าหน้าที่จริงต้องไม่โผล่บนกระดาน — ทีมตัดสินใจไม่ทำเรื่องวัดผลคน
    for (const staffName of ["พรทิวา", "ข้าวโอ๊ต", "หญิง", "ฝ้าย", "ครูพร"]) {
      expect(text).not.toContain(staffName);
    }
  });

  test("ไม่มีกราฟหรือแผนภูมิ", async ({ page }) => {
    await expect(page.locator("svg.recharts-surface, canvas")).toHaveCount(0);
  });
});
