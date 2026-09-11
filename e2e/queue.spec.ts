import { expect, test } from "@playwright/test";

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

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(EMAIL!);
    await page.getByLabel("รหัสผ่าน").fill(PASSWORD!);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/queue/);
  });

  test("นัดโทรพรุ่งนี้แล้ววันนี้ยังไม่ขึ้นคิว", async ({ page }) => {
    const name = `คิวพรุ่งนี้ ${Date.now()}`;
    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
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
    const name = `คิววันนี้ ${Date.now()}`;
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("0955556666");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
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
    const name = `คิวปิด ${Date.now()}`;
    const today = bangkokToday();

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
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
    const name = `คิวบันทึก ${Date.now()}`;
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
});
