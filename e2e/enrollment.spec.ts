import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

async function createEnrolled(page: import("@playwright/test").Page, name: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await page.goto(`/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/leads\/[0-9a-f-]+$/);

  await page.getByTestId("add-application").click();
  const dialog = page.getByRole("dialog", { name: "เพิ่มการสมัคร" });
  await dialog.getByLabel("ปีการศึกษา (พ.ศ.)").fill("2569");
  await page.getByTestId("submit-application").click();
  await expect(page.getByTestId("submit-application")).toHaveCount(0);

  // ชำระครบก่อน เพื่อพิสูจน์ว่าดรอปไม่ไปแตะสถานะการเงิน
  await page.getByTestId(/^pay-/).click();
  const payDialog = page.getByRole("dialog", { name: "บันทึกการชำระเงิน" });
  await payDialog.getByLabel("จำนวนเงิน (บาท)").fill("26900");
  await payDialog.getByLabel("สถานะการเงินที่ฝ่ายการเงินแจ้ง").selectOption("ชำระครบ");
  await page.getByTestId("submit-payment").click();
  await expect(page.getByTestId("submit-payment")).toHaveCount(0);

  await page.getByLabel("รหัสนักศึกษา").fill(`69${String(Date.now()).slice(-8)}`);
  await page.getByTestId(/^save-code-/).click();
  await expect(page.getByTestId("status-panel")).toContainText("เรียนอยู่");
}

test.describe("สถานะการเรียนและเครดิต", () => {
  test("ดรอปแล้วเกิดเครดิต และสถานะการเงินต้องไม่เปลี่ยน", async ({ page }) => {
    await createEnrolled(page, uniqueName("ดรอป"));

    await page.getByTestId("enrollment-ดรอป").click();
    const dialog = page.getByRole("dialog", { name: "ดรอป" });
    await dialog.getByLabel("เหตุผลที่ดรอป").fill("ผ่าตัดหัวใจ");
    await dialog.getByLabel("เครดิตค่าเทอมคงเหลือ (บาท)").fill("26900");
    await page.getByTestId("submit-enrollment-ดรอป").click();
    await expect(page.getByTestId("submit-enrollment-ดรอป")).toHaveCount(0);

    const status = page.getByTestId("status-panel");
    await expect(status).toContainText("ดรอป");
    // ★ ADR-0002: จ่ายครบแล้วดรอป การเงินต้องยังเป็นชำระครบ
    await expect(status).toContainText("ชำระครบ");

    await expect(page.getByTestId("credit-balance")).toContainText("26,900");
    await expect(page.getByTestId("timeline")).toContainText("ผ่าตัดหัวใจ");
  });

  test("กลับมาเรียนแล้วสถานะกลับเป็นปกติ เครดิตถูกใช้ ประวัติดรอปยังอยู่", async ({
    page,
  }) => {
    await createEnrolled(page, uniqueName("กลับมา"));

    await page.getByTestId("enrollment-ดรอป").click();
    const dropDialog = page.getByRole("dialog", { name: "ดรอป" });
    await dropDialog.getByLabel("เหตุผลที่ดรอป").fill("ป่วย");
    await dropDialog.getByLabel("เครดิตค่าเทอมคงเหลือ (บาท)").fill("3000");
    await page.getByTestId("submit-enrollment-ดรอป").click();
    await expect(page.getByTestId("credit-balance")).toBeVisible();

    await page.getByTestId("enrollment-กลับมาเรียน").click();
    await page.getByTestId("submit-enrollment-กลับมาเรียน").click();
    await expect(page.getByTestId("submit-enrollment-กลับมาเรียน")).toHaveCount(0);

    await expect(page.getByTestId("status-panel")).toContainText("เรียนอยู่");
    await expect(page.getByTestId("credit-balance")).toHaveCount(0);
    // ประวัติดรอปยังอยู่ครบ
    await expect(page.getByTestId("timeline")).toContainText("ดรอป");
  });

  test("กดยืนยันสถานะแล้ววันที่ยืนยันอัปเดต โดยค่าไม่เปลี่ยน", async ({ page }) => {
    await createEnrolled(page, uniqueName("ยืนยัน"));

    await page.getByTestId("confirm-status-การเรียน").click();

    const status = page.getByTestId("status-panel");
    await expect(status).toContainText("เรียนอยู่");
    await expect(status).toContainText("ยืนยันล่าสุด");
    await expect(page.getByTestId("timeline")).toContainText("ยืนยันสถานะการเรียน");
  });
});
