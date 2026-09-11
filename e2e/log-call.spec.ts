import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

async function createLead(page: import("@playwright/test").Page, name: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  // ค้นหาแทนการพึ่งว่าจะอยู่หน้าแรก เพราะเทสต์อื่นสร้างข้อมูลคู่ขนานกันอยู่
  await page.goto(`/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]+$/);
}

test.describe("บันทึกผลการโทรและไทม์ไลน์", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });


  test("บันทึกผลโทรจบได้ใน 3 แตะ และสถานะเปลี่ยนตามผล", async ({ page }) => {
    await createLead(page, uniqueName("โทร"));

    // แตะ 1: เปิด · แตะ 2: เลือกผล · แตะ 3: บันทึก
    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-คุยแล้วสนใจ").click();
    await page.getByTestId("submit-log-call").click();

    await expect(page.getByTestId("follow-up-status")).toHaveText("สนใจสมัคร");
    await expect(page.getByTestId("timeline")).toContainText("โทรตาม");
  });

  test("นัดโทรครั้งถัดไปแบบลัดได้", async ({ page }) => {
    await createLead(page, uniqueName("นัด"));

    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-นัดโทรใหม่").click();
    await page.getByRole("button", { name: "1 สัปดาห์" }).click();
    await page.getByTestId("submit-log-call").click();

    await expect(page.getByTestId("follow-up-status")).toHaveText("นัดโทรแล้ว");
    await expect(page.getByText(/นัดโทร \d/)).toBeVisible();
  });

  test("บันทึกย้อนหลังได้ และไทม์ไลน์เรียงตามเวลาที่เกิดจริง", async ({ page }) => {
    await createLead(page, uniqueName("ย้อนหลัง"));

    // ครั้งแรกบันทึกเป็นวันนี้
    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ไม่รับสาย").click();
    await page.getByTestId("submit-log-call").click();
    await expect(page.getByTestId("timeline")).toContainText("โทรตาม");

    // ครั้งที่สองบันทึกย้อนหลังไปปีก่อน ต้องไปอยู่ล่างสุดของไทม์ไลน์
    await page.getByTestId(/^open-log-call-/).click();
    await page.getByTestId("outcome-ขอคิดดูก่อน").click();
    await page.getByLabel("วันที่โทรจริง").fill("2025-01-15");
    await page.getByTestId("submit-log-call").click();

    const entries = page.getByTestId("timeline").locator("li");
    await expect(entries).toHaveCount(3);
    await expect(entries.last()).toContainText("2568"); // ปี พ.ศ. ของ 2025

    // ย้อนหลังแล้ว "ติดต่อเข้ามา" ต้องไม่ใช่รายการล่างสุดอีก
    await expect(entries.last()).toContainText("โทรตาม");
  });

  test("ปิดเคสแล้วสถานะเปลี่ยนและปุ่มปิดเคสหายไป", async ({ page }) => {
    await createLead(page, uniqueName("ปิด"));

    await page.getByTestId("close-ติดต่อไม่ได้").click();

    await expect(page.getByTestId("follow-up-status")).toHaveText("ติดต่อไม่ได้");
    await expect(page.getByTestId("close-ติดต่อไม่ได้")).toHaveCount(0);
  });
});
