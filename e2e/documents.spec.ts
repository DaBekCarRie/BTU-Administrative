import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

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
    await createPerson(page, uniqueName("เอกสาร"));

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
    await createPerson(page, uniqueName("ไม่ผ่าน"));

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
    await createPerson(page, uniqueName("อ่อนไหว"));

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
    const name = uniqueName("ค้างเอกสาร");
    await createPerson(page, name);

    await page.goto("/documents");
    const row = page.getByTestId("incomplete-rows").locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("0/4");
  });

  test("โต๊ะตรวจเอกสาร Desk View: อนุมัติ และส่งกลับแก้ไขด้วย Dropdown เหตุผลมาตรฐาน", async ({ page }) => {
    const name = uniqueName("โต๊ะตรวจ");
    await createPerson(page, name);

    // อัปโหลดรูปถ่าย
    await page.getByTestId("file-รูปถ่าย").setInputFiles(FIXTURE);
    await expect(page.getByTestId("doc-รูปถ่าย")).toContainText("ส่งแล้ว");

    // เปิดหน้าโต๊ะตรวจเอกสาร
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "โต๊ะตรวจเอกสาร" })).toBeVisible();

    // หาผู้สมัครในรายการซ้าย
    const studentBtn = page.getByRole("button", { name: new RegExp(name) });
    await expect(studentBtn).toBeVisible();
    await studentBtn.click();

    // เลือกแท็บรูปถ่าย
    await page.getByTestId("desk-tab-รูปถ่าย").click();

    // ตรวจอนุมัติ
    const approveBtn = page.getByTestId("desk-approve");
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    await expect(page.getByText("อนุมัติ รูปถ่าย แล้ว")).toBeVisible();
  });

  test("โต๊ะตรวจเอกสาร: สำเนาบัตรประชาชนเบลอโดยค่าเริ่มต้น และปลดเบลอพร้อมบันทึก", async ({ page }) => {
    const name = uniqueName("ตรวจบัตร");
    await createPerson(page, name);

    // อัปโหลดสำเนาบัตรประชาชน
    await page.getByTestId("file-สำเนาบัตรประชาชน").setInputFiles(FIXTURE);
    await expect(page.getByTestId("doc-สำเนาบัตรประชาชน")).toContainText("ส่งแล้ว");

    await page.goto("/documents");
    const studentBtn = page.getByRole("button", { name: new RegExp(name) });
    await studentBtn.click();

    // สลับไปแท็บสำเนาบัตรประชาชน
    await page.getByTestId("desk-tab-สำเนาบัตรประชาชน").click();

    // ตรวจสอบข้อความเตือนเบลอเอกสารอ่อนไหว
    await expect(page.getByText("เอกสารอ่อนไหว · เบลอไว้โดยค่าเริ่มต้น")).toBeVisible();

    // กดเพื่อดูเอกสารฉบับเต็ม
    const revealBtn = page.getByTestId("reveal-sensitive");
    await expect(revealBtn).toBeVisible();
    await revealBtn.click();

    // ตรวจสอบป้ายบันทึกการเปิดดูแล้ว
    await expect(page.getByText(/บันทึกการเปิดดูแล้ว/)).toBeVisible();

    // ทดสอบส่งกลับแก้ไขผ่าน Dropdown เหตุผลมาตรฐาน (ไม่ต้องใช้ window.prompt)
    await page.getByTestId("desk-open-reject").click();
    await page.getByTestId("desk-reject-reason").selectOption("รูปไม่ชัด อ่านไม่ออก");
    await page.getByTestId("desk-confirm-reject").click();
    await expect(page.getByText("ส่งกลับให้แก้ไขแล้ว · รูปไม่ชัด อ่านไม่ออก")).toBeVisible();
  });
});
