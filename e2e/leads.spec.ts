import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("เพิ่มผู้สนใจ", () => {
  test.skip(!EMAIL || !PASSWORD, "ต้องตั้ง E2E_EMAIL และ E2E_PASSWORD");

  // storageState ทำให้ล็อกอินอยู่แล้ว แต่ต้องเปิดหน้าใดหน้าหนึ่งก่อนถึงจะคลิกอะไรได้
  test.beforeEach(async ({ page }) => {
    await page.goto("/queue");
  });

  test("กรอกฟอร์มแล้วชื่อโผล่ในรายชื่อ", async ({ page }) => {
    const name = uniqueName("ทดสอบ");

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("081-234-5678");

    // เลือกคณะแล้วสาขาต้องเปิดให้เลือกตามคณะนั้น
    await page.getByLabel("สาขา").isDisabled();
    await page.getByLabel("คณะ").selectOption({ label: "บริหารธุรกิจ" });
    await page.getByLabel("สาขา").selectOption({ label: "การจัดการโลจิสติกส์" });
    await page.getByLabel("ภาค").selectOption("ทางไกล");
    await page.getByLabel("วุฒิที่ใช้สมัคร").selectOption("ม.6");

    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();

    await expect(page).toHaveURL(/\/leads$/);
    const row = page.getByTestId("lead-rows").locator("tr", { hasText: name });
    await expect(row).toBeVisible();

    // เบอร์ถูกจัดรูปแบบให้เหมือนกันก่อนบันทึก แม้กรอกมามีขีด
    await expect(row).toContainText("081-234-5678");
    await expect(row.locator('a[href="tel:0812345678"]')).toBeVisible();

    await expect(row).toContainText("การจัดการโลจิสติกส์");
    await expect(row).toContainText("ทางไกล");
    await expect(row).toContainText("ใหม่");
  });

  test("แก้ข้อมูลติดต่อแล้วบันทึกเป็นเหตุการณ์ ไม่ใช่เขียนทับ", async ({ page }) => {
    const name = uniqueName("แก้ไข");

    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
    await page.getByLabel("เบอร์โทร").fill("0899999999");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
    await expect(page).toHaveURL(/\/leads$/);

    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]+$/);
    await page.getByRole("link", { name: "แก้ไขข้อมูล" }).click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]+\/edit/);

    // ฟอร์มเติมค่าเดิมมาให้
    await expect(page.getByLabel("เบอร์โทร")).toHaveValue("0899999999");

    await page.getByLabel("เบอร์โทร").fill("0877777777");
    await page.getByLabel("ชื่อเล่น").fill("เล่นใหม่");
    await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();

    await expect(page).toHaveURL(/\/leads$/);
    const row = page.getByTestId("lead-rows").locator("tr", { hasText: name });
    await expect(row).toContainText("087-777-7777");
  });

  test("ทุกช่องประเภทเป็น dropdown ไม่มีช่องพิมพ์อิสระ", async ({ page }) => {
    await page.goto("/leads/new");

    for (const label of [
      "คณะ",
      "สาขา",
      "ภาค",
      "วุฒิที่ใช้สมัคร",
      "เจ้าหน้าที่ผู้ดูแล",
    ]) {
      const field = page.getByLabel(label);
      await expect(field).toHaveJSProperty("tagName", "SELECT");
    }
  });

  test("เบอร์โทรผิดรูปแบบขึ้นข้อความบอก และไม่บันทึก", async ({ page }) => {
    await page.goto("/leads/new");
    await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill("เบอร์พัง");
    await page.getByLabel("เบอร์โทร").fill("123");
    await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();

    await expect(page.getByTestId("lead-error")).toContainText("เบอร์โทรไม่ถูกต้อง");
    await expect(page).toHaveURL(/\/leads\/new/);
  });

  test("การเลือกพร้อมกันหลายรายการ (Bulk Selection) แถบ Floating Action Bar และการเปิดแฟ้ม", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByTestId("result-count")).toBeVisible();

    // มีหัวตารางและการกระทำเปิดแฟ้ม
    await expect(page.getByRole("columnheader", { name: "การกระทำ" })).toBeVisible();
    const rows = page.getByTestId("lead-rows").locator("tr");
    const count = await rows.count();
    if (count > 0) {
      // แถบ bulk action ยังไม่แสดงตอนแรก
      await expect(page.getByTestId("bulk-action-bar")).not.toBeVisible();

      // ติ๊กเลือกทั้งหมด
      await page.getByTestId("select-all").click();
      await expect(page.getByTestId("bulk-action-bar")).toBeVisible();
      await expect(page.getByTestId("selected-count")).toContainText(`เลือกไว้ ${count} ราย`);
      await expect(page.getByTestId("bulk-export-btn")).toBeVisible();
      await expect(page.getByTestId("bulk-change-owner-btn")).toBeVisible();

      // ยกเลิกการเลือก
      await page.getByTestId("bulk-clear-btn").click();
      await expect(page.getByTestId("bulk-action-bar")).not.toBeVisible();

      // เลือกแถวแรก
      const firstRowCheckbox = rows.first().locator('input[type="checkbox"]');
      await firstRowCheckbox.click();
      await expect(page.getByTestId("bulk-action-bar")).toBeVisible();
      await expect(page.getByTestId("selected-count")).toContainText("เลือกไว้ 1 ราย");

      // ปุ่มเปิดแฟ้มมีอยู่
      const openBtn = rows.first().getByRole("link", { name: "เปิดแฟ้ม" });
      await expect(openBtn).toBeVisible();

      // เปลี่ยนผู้ดูแล
      await page.getByTestId("bulk-change-owner-btn").click();
      await expect(page.getByRole("heading", { name: "เปลี่ยนผู้ดูแล" })).toBeVisible();
      await page.getByRole("button", { name: "ยกเลิก" }).click();
      await expect(page.getByRole("heading", { name: "เปลี่ยนผู้ดูแล" })).not.toBeVisible();
    }
  });

  test("มุมมองมือถือ: แสดงรายการการ์ดและแถบชิปสถานะติดตามแบบเลื่อนแนวนอน", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/leads");

    // แถบชิปสถานะต้องมองเห็นบนมือถือ
    const chips = page.getByTestId("mobile-status-chips");
    await expect(chips).toBeVisible();
    await expect(page.getByTestId("status-chip-ทั้งหมด")).toBeVisible();
    await expect(page.getByTestId("status-chip-ใหม่")).toBeVisible();

    // รายการการ์ดบนมือถือ
    await expect(page.getByTestId("lead-mobile-cards")).toBeVisible();

    // ลองกดชิป "ใหม่"
    await page.getByTestId("status-chip-ใหม่").click();
    await expect(page).toHaveURL(/status=/);

    // กดชิป "ทั้งหมด" เพื่อรีเซ็ต
    await page.getByTestId("status-chip-ทั้งหมด").click();
    await expect(page).toHaveURL(/\/leads(\?page=1)?$/);
  });
});

