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

async function requestCenter(
  page: import("@playwright/test").Page,
  center: string,
  year: string,
) {
  await page.getByTestId("add-exam-request").click();
  await page.getByLabel("ศูนย์สอบ").fill(center);
  await page.getByLabel("ปีการศึกษา").fill(year);
  await page.getByTestId("submit-exam-request").click();
  await expect(page.getByTestId("submit-exam-request")).toHaveCount(0);
}

test.describe("ศูนย์สอบพิเศษ", () => {
  test("ขอศูนย์สอบแล้วขึ้นในหน้าสรุป แยกตามศูนย์", async ({ page }) => {
    const name = uniqueName("สอบ");
    await createPerson(page, name);
    await requestCenter(page, "เชียงใหม่", "2569");

    await expect(page.getByTestId("exam-requests")).toContainText("เชียงใหม่");
    await expect(page.getByTestId("timeline")).toContainText("ขอศูนย์สอบพิเศษ");

    await page.goto("/exams");
    const group = page
      .getByTestId("center-groups")
      .locator("section", { hasText: "ศูนย์เชียงใหม่" });
    await expect(group).toContainText(name);
  });

  test("ถอนคำขอแล้วหายจากหน้าสรุป แต่ยังเห็นในไทม์ไลน์", async ({ page }) => {
    const name = uniqueName("ถอนสอบ");
    await createPerson(page, name);
    await requestCenter(page, "ชัยภูมิ", "2569");

    const personUrl = page.url();

    await page.goto("/exams");
    await expect(
      page.getByTestId("center-groups").locator("section", { hasText: "ศูนย์ชัยภูมิ" }),
    ).toContainText(name);

    await page.goto(personUrl);
    await page.getByTestId(/^withdraw-/).click();
    await expect(page.getByTestId("exam-requests")).toContainText("ถอนแล้ว");
    await expect(page.getByTestId("timeline")).toContainText("ถอนคำขอศูนย์สอบ");

    await page.goto("/exams");
    const group = page
      .getByTestId("center-groups")
      .locator("section", { hasText: "ศูนย์ชัยภูมิ" });
    if ((await group.count()) > 0) {
      await expect(group).not.toContainText(name);
    }
  });

  test("หน้าสรุปเตือนว่าไม่ซิงก์กับระบบมหาวิทยาลัย", async ({ page }) => {
    await page.goto("/exams");
    await expect(page.getByRole("note")).toContainText("ไม่ได้ซิงก์");
  });

  test("คัดลอกรายชื่อแยกตามศูนย์ได้ในคลิกเดียว", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const name = uniqueName("คัดลอก");
    await createPerson(page, name);
    await requestCenter(page, "อำนาจเจริญ", "2569");

    await page.goto("/exams");
    await page.getByTestId("copy-อำนาจเจริญ").click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("ศูนย์อำนาจเจริญ");
    expect(clipboard).toContain(name);
    expect(clipboard).toMatch(/^\d+\./m);
  });
});
