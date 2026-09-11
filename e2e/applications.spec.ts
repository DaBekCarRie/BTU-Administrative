import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

async function createPerson(page: import("@playwright/test").Page, name: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await page.goto(`/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
}

async function addApplication(
  page: import("@playwright/test").Page,
  year: string,
) {
  await page.getByTestId("add-application").click();
  const dialog = page.getByRole("dialog", { name: "เพิ่มการสมัคร" });
  await dialog.getByLabel("ปีการศึกษา (พ.ศ.)").fill(year);
  await dialog.getByLabel("คณะ").selectOption({ label: "บริหารธุรกิจ" });
  await dialog.getByLabel("สาขา").selectOption({ label: "การจัดการ" });
  await dialog.getByLabel("ภาค").selectOption("ทางไกล");
  await page.getByTestId("submit-application").click();
  await expect(page.getByTestId("submit-application")).toHaveCount(0);
}

test.describe("การสมัคร ชำระเงิน รหัสนักศึกษา", () => {
  test("ยื่นสมัครแล้วสถานะติดตามเป็น สมัครแล้ว และหลุดจากคิว", async ({ page }) => {
    await createPerson(page, uniqueName("สมัคร"));
    await addApplication(page, "2569");

    await expect(page.getByTestId("application-list")).toContainText("การจัดการ");
    await expect(page.getByTestId("follow-up-status")).toHaveText("สมัครแล้ว");
    await expect(page.getByTestId("timeline")).toContainText("ยื่นสมัคร");
  });

  test("คนเดียวสมัครได้หลายรอบ", async ({ page }) => {
    await createPerson(page, uniqueName("สมัครซ้ำ"));
    await addApplication(page, "2568");
    await addApplication(page, "2569");

    await expect(page.getByTestId("application-list").locator("> li")).toHaveCount(2);
  });

  test("บันทึกการชำระแล้วยอดรวมและสถานะการเงินเปลี่ยน พร้อมวันที่ยืนยัน", async ({
    page,
  }) => {
    await createPerson(page, uniqueName("ชำระ"));
    await addApplication(page, "2569");

    await page.getByTestId(/^pay-/).click();
    const dialog = page.getByRole("dialog", { name: "บันทึกการชำระเงิน" });
    await dialog.getByLabel("จำนวนเงิน (บาท)").fill("3000");
    await dialog.getByLabel("สถานะการเงินที่ฝ่ายการเงินแจ้ง").selectOption("รักษาสภาพ");
    await dialog.getByLabel("เลขที่ใบเสร็จ").fill("RV:69-19030");
    await page.getByTestId("submit-payment").click();
    await expect(page.getByTestId("submit-payment")).toHaveCount(0);

    await expect(page.getByTestId("application-list")).toContainText("RV:69-19030");
    await expect(page.getByTestId("application-list")).toContainText("฿3,000");

    // ADR-0003: สถานะที่เป็นสำเนาต้องมีวันที่ยืนยันติดเสมอ
    const statusPanel = page.getByTestId("status-panel");
    await expect(statusPanel).toContainText("รักษาสภาพ");
    await expect(statusPanel).toContainText("ยืนยันล่าสุด");
  });

  test("รักษาสภาพต้องไม่ทำให้สถานะการเรียนเปลี่ยน", async ({ page }) => {
    await createPerson(page, uniqueName("รักษาสภาพ"));
    await addApplication(page, "2569");

    await page.getByTestId(/^pay-/).click();
    const dialog = page.getByRole("dialog", { name: "บันทึกการชำระเงิน" });
    await dialog.getByLabel("จำนวนเงิน (บาท)").fill("500");
    await dialog.getByLabel("สถานะการเงินที่ฝ่ายการเงินแจ้ง").selectOption("รักษาสภาพ");
    await page.getByTestId("submit-payment").click();
    await expect(page.getByTestId("submit-payment")).toHaveCount(0);

    const statusPanel = page.getByTestId("status-panel");
    await expect(statusPanel).toContainText("รักษาสภาพ");
    // ADR-0002: การเงินเปลี่ยนแล้ว แต่การเรียนต้องไม่ขยับ
    await expect(statusPanel).toContainText("ยังไม่เริ่ม");
  });

  test("บันทึกรหัสนักศึกษาแล้วสถานะการเรียนเป็น เรียนอยู่", async ({ page }) => {
    await createPerson(page, uniqueName("รหัส"));
    await addApplication(page, "2569");

    const code = `69${String(Date.now()).slice(-8)}`;
    await page.getByLabel("รหัสนักศึกษา").fill(code);
    await page.getByTestId(/^save-code-/).click();

    await expect(page.getByTestId("application-list")).toContainText(code);
    await expect(page.getByTestId("status-panel")).toContainText("เรียนอยู่");
    await expect(page.getByTestId("timeline")).toContainText("ได้รหัสนักศึกษา");
  });
});
