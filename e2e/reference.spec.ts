import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { uniqueName } from "./helpers";

const PNG = "e2e/fixtures/doc.png";
const PDF = "e2e/fixtures/doc.pdf";

async function addReference(
  page: Page,
  { title, category, year, files }: { title: string; category: string; year?: string; files: string[] },
) {
  await page.goto("/reference");
  await page.getByTestId("add-reference").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("หมวด").selectOption(category);
  await dialog.getByLabel("ชื่อเรื่อง").fill(title);
  if (year !== undefined) await dialog.getByLabel("ปีการศึกษา").selectOption(year);
  if (files.length > 0) await dialog.getByLabel("ไฟล์ (เลือกได้หลายไฟล์)").setInputFiles(files);
  await dialog.getByRole("button", { name: "บันทึก" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  return page.getByTestId("reference-item").filter({ hasText: title });
}

test.describe("เอกสารอ้างอิง", () => {
  test("เมนูแยกจากเอกสารประจำตัว", async ({ page }) => {
    await page.goto("/queue");
    const sidebar = page.getByTestId("sidebar");
    await sidebar.getByRole("link", { name: "เอกสารอ้างอิง" }).click();
    await page.waitForURL(/\/reference$/);
    await expect(page.getByRole("heading", { name: "เอกสารอ้างอิง" })).toBeVisible();
  });

  test("เพิ่มตารางสอบพร้อมปีการศึกษาและแนบหลายไฟล์ เห็นว่าใครอัปโหลด", async ({ page }) => {
    const title = uniqueName("ตารางสอบ");
    const item = await addReference(page, { title, category: "ตารางสอบ", files: [PNG, PDF] });

    await expect(item).toBeVisible();
    await expect(item).toContainText("ตารางสอบ");
    await expect(item.getByTestId("reference-year")).toContainText(/ปีการศึกษา 25\d\d/);
    await expect(item).toContainText("อัปโหลดโดย");
    await expect(item.getByTestId("reference-file")).toHaveCount(2);
    await expect(item).toContainText("PDF");
    // ไม่มีสถานะผ่าน/ไม่ผ่าน — ไม่ใช่เอกสารที่ต้องตรวจ
    await expect(item).not.toContainText(/ผ่าน|ส่งแล้ว/);
  });

  test("ของที่ไม่ผูกกับปีเว้นปีการศึกษาได้", async ({ page }) => {
    const title = uniqueName("โปสเตอร์");
    const item = await addReference(page, { title, category: "สื่อประชาสัมพันธ์", year: "", files: [PNG] });
    await expect(item.getByTestId("reference-year")).toHaveText("ไม่ผูกกับปี");
  });

  test("เปิดไฟล์ได้ผ่านลิงก์อายุสั้นจาก bucket เอกสารอ้างอิง", async ({ page }) => {
    const title = uniqueName("ปฏิทิน");
    const item = await addReference(page, { title, category: "ปฏิทินการศึกษา", files: [PDF] });

    // ดูที่คำขอของแท็บใหม่ ไม่รอให้หน้าโหลด — Chromium แบบ headless เปลี่ยน PDF เป็นการดาวน์โหลด
    // การนำทางจึงถูกยกเลิกกลางทาง ทั้งที่ลิงก์ถูกต้อง
    const signedRequest = page
      .context()
      .waitForEvent("request", (request) => /\/storage\/v1\/object\/sign\/reference\//.test(request.url()));
    await item.getByTestId("reference-file").click();
    const request = await signedRequest;
    expect(request.url()).toContain("token=");
  });

  test("แก้ชื่อเรื่องได้ และแนบไฟล์เพิ่มทีหลังได้", async ({ page }) => {
    const title = uniqueName("แบบฟอร์ม");
    const item = await addReference(page, { title, category: "แบบฟอร์ม", files: [] });
    await expect(item).toContainText("ยังไม่มีไฟล์");

    await item.getByTestId("attach-reference-files").setInputFiles([PNG]);
    await expect(item.getByTestId("reference-file")).toHaveCount(1, { timeout: 20_000 });

    const renamed = `${title} ฉบับแก้`;
    await item.getByTestId("edit-reference").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("ชื่อเรื่อง").fill(renamed);
    await dialog.getByRole("button", { name: "บันทึก" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("reference-item").filter({ hasText: renamed })).toBeVisible();
  });

  test("ชนิดไฟล์ที่ไม่รับถูกปฏิเสธ ไม่ขึ้นเป็นไฟล์แนบ", async ({ page }) => {
    const title = uniqueName("ประกาศ");
    const item = await addReference(page, { title, category: "ประกาศ", files: [] });
    await item.getByTestId("attach-reference-files").setInputFiles({
      name: "สรุป.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("ไม่ใช่รูปหรือ PDF"),
    });
    await expect(page.getByText(/รับเฉพาะรูปภาพและ PDF/)).toBeVisible();
    await expect(item.getByTestId("reference-file")).toHaveCount(0);
  });

  test("ค้นด้วยบางส่วนของชื่อเรื่อง แล้วกรองหมวดและปีร่วมกันได้", async ({ page }) => {
    const tag = uniqueName("ค้นหา");
    const exam = `${tag} ตารางสอบทางไกล`;
    const poster = `${tag} โปสเตอร์`;
    await addReference(page, { title: exam, category: "ตารางสอบ", files: [] });
    await addReference(page, { title: poster, category: "สื่อประชาสัมพันธ์", year: "", files: [] });

    const filters = page.getByTestId("reference-filters");
    const items = page.getByTestId("reference-item");

    // พิมพ์ไม่ครบก็เจอ
    await filters.getByLabel("ค้นชื่อเรื่อง").fill(tag.slice(0, -2));
    await filters.getByLabel("ค้นชื่อเรื่อง").press("Enter");
    await page.waitForURL(/[?&]q=/);
    await expect(items.filter({ hasText: exam })).toBeVisible();
    await expect(items.filter({ hasText: poster })).toBeVisible();

    await filters.getByLabel("หมวด").selectOption("ตารางสอบ");
    await page.waitForURL(/[?&]category=/);
    await expect(items.filter({ hasText: exam })).toBeVisible();
    await expect(items.filter({ hasText: poster })).toHaveCount(0);

    await filters.getByLabel("หมวด").selectOption("");
    await filters.getByLabel("ปีการศึกษา").selectOption("none");
    await page.waitForURL(/[?&]year=none/);
    await expect(items.filter({ hasText: poster })).toBeVisible();
    await expect(items.filter({ hasText: exam })).toHaveCount(0);

    await page.getByRole("link", { name: "ล้างตัวกรอง" }).click();
    await page.waitForURL(/\/reference$/);
  });

  test("ค้นด้วย % ไม่กลายเป็น wildcard", async ({ page }) => {
    const title = uniqueName("ลด 50% ค่าสมัคร");
    await addReference(page, { title, category: "ประกาศ", files: [] });
    await page.goto(`/reference?q=${encodeURIComponent("%")}`);
    // ทุกรายการที่เห็นต้องมี % จริง ๆ ในชื่อ
    const titles = await page.getByTestId("reference-item").locator("h2").allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.filter((t) => !t.includes("%"))).toEqual([]);
  });

  test("หัวหน้าทีมลบได้หลังยืนยัน และไฟล์ใน storage ถูกลบด้วย ไม่เหลือไฟล์กำพร้า", async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!url || !anonKey || !email || !password, "ต้องมีค่าเชื่อมต่อและบัญชีทดสอบใน .env.local");

    const title = uniqueName("ลบทิ้ง");
    const item = await addReference(page, { title, category: "อื่นๆ", files: [PNG, PDF] });
    await expect(item.getByTestId("reference-file")).toHaveCount(2);
    const id = await item.getAttribute("data-reference-id");

    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email: email!, password: password! });
    expect(signInError).toBeNull();
    const before = await client.storage.from("reference").list(id!);
    expect(before.data?.length).toBe(2);

    // บัญชีทดสอบตั้งต้นเป็นหัวหน้าทีม — กรณีเจ้าหน้าที่ลบไม่ได้รอบัญชีจากใบ 01
    await item.getByTestId("delete-reference").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("กู้คืนไม่ได้");
    await expect(dialog).toContainText("2 ไฟล์");
    await dialog.getByTestId("confirm-delete-reference").click();
    // ลบไฟล์ใน storage + ลบแถว + โหลดรายการใหม่ ช้ากว่า 5 วินาทีได้ตอนรันขนาน
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByTestId("reference-item").filter({ hasText: title })).toHaveCount(0, {
      timeout: 20_000,
    });
    const after = await client.storage.from("reference").list(id!);
    expect(after.data ?? []).toEqual([]);
  });

  test.describe("มือถือ", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("หน้าเอกสารอ้างอิงใช้งานได้บนมือถือ", async ({ page }) => {
      await page.goto("/reference");
      await expect(page.getByTestId("mobile-header")).toContainText("เอกสารอ้างอิง");
      await expect(page.getByTestId("add-reference")).toBeVisible();
    });
  });
});
