import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

/** วันนี้ตามเวลาไทย — toISOString() ให้ UTC ซึ่งช่วงดึกจะเป็นเมื่อวาน */
function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** กดบันทึกแล้วรอให้กล่องปิด ซึ่งเกิดขึ้นเมื่อ server action ทำงานเสร็จเท่านั้น */
async function submitCall(page: import("@playwright/test").Page) {
  await page.getByTestId("submit-log-call").click();
  await expect(page.getByTestId("submit-log-call")).toHaveCount(0);
}

test.describe("คิวโทรวันนี้", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("นัดโทรพรุ่งนี้แล้ววันนี้ยังไม่ขึ้นคิว", async ({ page }) => {
    const name = uniqueName("คิวพรุ่งนี้");
    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    // ต้องรอให้ server action เสร็จก่อน ไม่งั้นการ navigate จะยกเลิกมันกลางคัน
    await expect(page).toHaveURL(/\/leads$/);
    await page.goto(`/leads?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);

    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-นัดโทรใหม่").click();
    await page.getByRole("button", { name: "พรุ่งนี้" }).click();
    await submitCall(page);
    await expect(page.getByTestId("follow-up-status")).toHaveText("นัดโทรแล้ว");

    await page.goto("/queue");
    await expect(page.getByText(name)).toHaveCount(0);
  });

  test("คนที่นัดไว้วันนี้ขึ้นคิว พร้อมจำนวนครั้งและผลครั้งล่าสุด", async ({ page }) => {
    const name = uniqueName("คิววันนี้");
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("0955556666");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    // ต้องรอให้ server action เสร็จก่อน ไม่งั้นการ navigate จะยกเลิกมันกลางคัน
    await expect(page).toHaveURL(/\/leads$/);
    await page.goto(`/leads?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);

    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ขอคิดดูก่อน").click();
    await page.getByLabel("เลือกวันเอง").fill(today);
    await submitCall(page);

    await page.goto("/queue");
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("1 ครั้ง");
    await expect(row).toContainText("ขอคิดดูก่อน");
    await expect(row.locator('a[href="tel:0955556666"]')).toBeVisible();
  });

  test("ปิดเคสแล้วหายจากคิวทันที", async ({ page }) => {
    const name = uniqueName("คิวปิด");
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    // ต้องรอให้ server action เสร็จก่อน ไม่งั้นการ navigate จะยกเลิกมันกลางคัน
    await expect(page).toHaveURL(/\/leads$/);
    await page.goto(`/leads?q=${encodeURIComponent(name)}`);
    await page.getByRole("link", { name }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
    const personUrl = page.url();

    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ขอคิดดูก่อน").click();
    await page.getByLabel("เลือกวันเอง").fill(today);
    await submitCall(page);

    await page.goto("/queue");
    await expect(page.locator("tr", { hasText: name })).toBeVisible();

    await page.goto(personUrl);
    await page.getByTestId("close-ไม่สนใจ").click();
    await expect(page.getByTestId("follow-up-status")).toHaveText("ไม่สนใจ");

    await page.goto("/queue");
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
  });

  test("บันทึกผลโทรได้จากแถวในคิวโดยไม่ต้องเปิดหน้าใหม่", async ({ page }) => {
    const name = uniqueName("คิวบันทึก");
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await page.getByRole("link", { name }).click();
    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ขอคิดดูก่อน").click();
    await page.getByLabel("เลือกวันเอง").fill(today);
    await submitCall(page);

    await page.goto("/queue");
    const row = page.locator("tr", { hasText: name });
    await row.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-คุยแล้วสนใจ").click();
    await submitCall(page);

    // สนใจสมัครแล้ว ไม่มีนัดครั้งถัดไป จึงหายจากคิว
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
  });

  test("แสดง Summary Strip และสลับซ่อน/แสดงกระดานงานได้", async ({ page }) => {
    await page.goto("/queue");

    // ตรวจสอบ Summary Strip
    const strip = page.getByTestId("totals-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("ค้างโทร");
    await expect(strip).toContainText("โทรแล้ว");

    // ตรวจสอบ Workboard Tiles และปุ่มสลับ
    const board = page.getByTestId("work-board");
    await expect(board).toBeVisible();

    const toggleBtn = strip.getByRole("button", { name: "ซ่อนกระดานงาน" });
    await toggleBtn.click();
    await expect(board).toBeHidden();

    const showBtn = strip.getByRole("button", { name: "ดูกระดานงาน" });
    await showBtn.click();
    await expect(board).toBeVisible();
  });

  test("บนมือถือเปิดบันทึกผลโทรเป็น Bottom Sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const name = uniqueName("คิวมือถือ");
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await page.getByRole("link", { name }).click();
    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ขอคิดดูก่อน").click();
    await page.getByLabel("เลือกวันเอง").fill(today);
    await submitCall(page);

    await page.goto("/queue");
    const card = page.locator("article", { hasText: name });
    await expect(card).toBeVisible();

    // แตะเปิดบันทึกผลโทรบนการ์ดมือถือ
    await card.getByTestId(/^open-log-call-/).click();

    // ตรวจสอบ Bottom Sheet
    const sheet = page.getByRole("dialog", { name: "บันทึกการโทร" });
    await expect(sheet).toBeVisible();
    await sheet.getByTestId("outcome-คุยแล้วสนใจ").click();
    await submitCall(page);

    await expect(page.locator("article", { hasText: name })).toHaveCount(0);
  });
});
