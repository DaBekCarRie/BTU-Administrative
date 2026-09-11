import { expect, test } from "@playwright/test";

const FIXTURE = "e2e/fixtures/doc.png";

async function createPerson(page: import("@playwright/test").Page, name: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await page.goto(`/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
}

test.describe("เอกสารประจำตัว", () => {
  test("อัปโหลดแล้วเช็กลิสต์เปลี่ยน ตรวจผ่านแล้วนับเพิ่ม", async ({ page }) => {
    await createPerson(page, `เอกสาร ${Date.now()}`);

    await expect(page.getByTestId("doc-progress")).toHaveText("ผ่านแล้ว 0/4");

    await page.getByTestId("file-รูปถ่าย").setInputFiles(FIXTURE);
    const photo = page.getByTestId("doc-รูปถ่าย");
    await expect(photo).toContainText("ส่งแล้ว");

    // ส่งแล้วแต่ยังไม่ตรวจ ไม่นับว่าครบ
    await expect(page.getByTestId("doc-progress")).toHaveText("ผ่านแล้ว 0/4");

    await page.getByTestId("pass-รูปถ่าย").click();
    await expect(photo).toContainText("ผ่าน");
    await expect(page.getByTestId("doc-progress")).toHaveText("ผ่านแล้ว 1/4");
  });

  test("ไม่ผ่านต้องบอกเหตุผล และเหตุผลแสดงให้คนรับงานต่อเห็น", async ({ page }) => {
    await createPerson(page, `ไม่ผ่าน ${Date.now()}`);

    await page.getByTestId("file-วุฒิการศึกษา").setInputFiles(FIXTURE);
    await expect(page.getByTestId("doc-วุฒิการศึกษา")).toContainText("ส่งแล้ว");

    page.once("dialog", (dialog) => dialog.accept("ภาพเบลอ อ่านชื่อไม่ออก"));
    await page.getByTestId("reject-วุฒิการศึกษา").click();

    const card = page.getByTestId("doc-วุฒิการศึกษา");
    await expect(card).toContainText("ไม่ผ่าน");
    await expect(card).toContainText("ภาพเบลอ อ่านชื่อไม่ออก");
    await expect(page.getByTestId("doc-progress")).toHaveText("ผ่านแล้ว 0/4");
  });

  test("สำเนาบัตรประชาชนบอกว่าการเปิดดูจะถูกบันทึก", async ({ page }) => {
    await createPerson(page, `อ่อนไหว ${Date.now()}`);

    await page.getByTestId("file-สำเนาบัตรประชาชน").setInputFiles(FIXTURE);
    const card = page.getByTestId("doc-สำเนาบัตรประชาชน");

    await expect(card).toContainText("การเปิดดูจะถูกบันทึกไว้");
    await expect(card.getByRole("button", { name: "แสดงเอกสาร" })).toBeVisible();

    // รูปถ่ายไม่ใช่เอกสารอ่อนไหว จึงไม่มีข้อความนี้
    await page.getByTestId("file-รูปถ่าย").setInputFiles(FIXTURE);
    await expect(page.getByTestId("doc-รูปถ่าย")).not.toContainText(
      "การเปิดดูจะถูกบันทึกไว้",
    );
  });

  test("หน้าเอกสารแสดงคนที่ยังไม่ครบ", async ({ page }) => {
    const name = `ค้างเอกสาร ${Date.now()}`;
    await createPerson(page, name);

    await page.goto("/documents");
    const row = page.getByTestId("incomplete-rows").locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("0/4");
  });
});
