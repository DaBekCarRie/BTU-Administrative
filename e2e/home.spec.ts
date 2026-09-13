import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** ใบ 08 — หน้าแรกคือภาพรวมการรับสมัคร + คิวโทรวันนี้ในหน้าเดียว */
test.describe("หน้าแรก", () => {
  test("หน้าแรกไม่เด้งไปคิวโทร แต่แสดงกรวยห้าขั้นและคิวโทรวันนี้ในหน้าเดียว", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);

    const funnel = page.getByTestId("home-funnel");
    await expect(funnel).toBeVisible();
    for (const label of ["ติดต่อเข้ามา", "สนใจสมัคร", "ยื่นสมัคร", "ชำระแล้ว", "ได้รหัสนักศึกษา"]) {
      await expect(funnel).toContainText(label);
    }

    // ทุกขั้นบอกตัวเลขเดือนที่แล้วพร้อมส่วนต่าง หรือบอกว่ายังไม่มีข้อมูล — ไม่มีช่องว่างที่ดูเหมือนพัง
    for (const key of ["contacted", "interested", "applied", "paid", "student_code"]) {
      await expect(page.getByTestId(`funnel-${key}`)).toContainText(
        /เพิ่มขึ้น|ลดลง|เท่าเดิม|ยังไม่มีข้อมูล/,
      );
    }

    await expect(page.getByTestId("queue-summary")).toContainText("ต้องโทร");
  });

  test("คิวโทรยังมีเมนูของตัวเอง และหน้าแรกอยู่ในเมนูข้าง", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByTestId("queue-summary")).toBeVisible();
    await expect(page.getByTestId("home-funnel")).toHaveCount(0);

    await page.getByTestId("sidebar").getByRole("link", { name: "หน้าแรก" }).click();
    await expect(page.getByTestId("home-funnel")).toBeVisible();
  });

  test("หน้าแรกไม่มีกราฟหรือแผนภูมิ", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-funnel")).toBeVisible();
    await expect(page.locator("svg.recharts-surface, canvas")).toHaveCount(0);
  });

  test("ตัวเลขภาพรวมไม่มีชื่อเจ้าหน้าที่", async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!url || !anonKey || !email || !password, "ต้องมีค่าเชื่อมต่อและบัญชีทดสอบใน .env.local");

    // อ่านชื่อจากฐานข้อมูล ไม่เขียนชื่อคนจริงลงในเทสต์
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    expect(signInError).toBeNull();
    const { data: staff, error } = await client.from("staff").select("display_name");
    expect(error).toBeNull();
    expect(staff?.length).toBeGreaterThan(0);

    await page.goto("/");
    const text = await page.getByTestId("home-funnel").innerText();
    for (const { display_name } of staff ?? []) {
      expect(text).not.toContain(display_name);
    }
  });

  test("กรองตามคณะแล้วตัวเลขไม่เกินภาพรวม และค่าอยู่ใน URL", async ({ page }) => {
    await page.goto("/");
    const contacted = page.getByTestId("funnel-contacted");
    const overall = Number((await contacted.locator(".font-mono").innerText()).replace(/\D/g, ""));

    const faculty = page.getByTestId("funnel-filters").getByLabel("คณะ", { exact: true });
    const firstFaculty = await faculty.locator("option").nth(1).getAttribute("value");
    await faculty.selectOption(firstFaculty!);
    await page.waitForURL(/[?&]faculty=/);

    const filtered = Number((await contacted.locator(".font-mono").innerText()).replace(/\D/g, ""));
    expect(filtered).toBeLessThanOrEqual(overall);
    await expect(page.getByTestId("funnel-filters").getByLabel("คณะ", { exact: true })).toHaveValue(firstFaculty!);

    await page.getByTestId("funnel-filters").getByLabel("ภาค", { exact: true }).selectOption("ทางไกล");
    await page.waitForURL(/[?&]mode=/);
    await expect(page).toHaveURL(/faculty=/);

    await page.getByRole("link", { name: "ล้างตัวกรอง" }).click();
    await page.waitForURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByTestId("funnel-filters").getByLabel("คณะ", { exact: true })).toHaveValue("");
    await expect(page.getByTestId("funnel-filters").getByLabel("ภาค", { exact: true })).toHaveValue("");
  });

  test("เปลี่ยนตัวกรองสองช่องติดกันเร็ว ๆ ค่าที่เพิ่งล้างไม่กลับมา", async ({ page }) => {
    await page.goto("/");
    const filters = page.getByTestId("funnel-filters");
    const faculty = filters.getByLabel("คณะ", { exact: true });
    const firstFaculty = await faculty.locator("option").nth(1).getAttribute("value");
    await faculty.selectOption(firstFaculty!);
    await page.waitForURL(/[?&]faculty=/);

    // ไม่รอให้หน้าโหลดใหม่ระหว่างสองคำสั่ง — เคยทำให้คณะที่ล้างไปแล้วกลับมาใน URL
    await faculty.selectOption("");
    await filters.getByLabel("ภาค", { exact: true }).selectOption("ทางไกล");
    await page.waitForURL(/[?&]mode=/);
    await expect(page).not.toHaveURL(/faculty=/);
  });

  test("เลื่อนดูย้อนหลังได้หกเดือน และเทียบกับเดือนก่อนหน้าของเดือนที่เลือก", async ({ page }) => {
    await page.goto("/");
    const month = page.getByTestId("funnel-filters").getByLabel("เดือน", { exact: true });
    await expect(month.locator("option")).toHaveCount(6);

    const labels = await month.locator("option").allInnerTexts();
    await month.selectOption("-2");
    await page.waitForURL(/[?&]month=-2/);

    const funnel = page.getByTestId("home-funnel");
    // เดือนที่เลือกคือ labels[2] และเทียบกับเดือนก่อนหน้าคือ labels[3]
    await expect(funnel).toContainText(`ติดต่อเข้ามาใน ${labels[2]}`);
    await expect(funnel).toContainText(`เทียบกับ ${labels[3]}`);
  });

  test("ค่าตัวกรองแปลก ๆ ใน URL ไม่ทำให้หน้าพัง", async ({ page }) => {
    await page.goto("/?faculty=not-a-uuid&mode=ออนไลน์&month=-99");
    await expect(page.getByTestId("home-funnel")).toBeVisible();
    await expect(page.getByTestId("funnel-filters").getByLabel("เดือน", { exact: true })).toHaveValue("0");
    await expect(page.getByTestId("funnel-filters").getByLabel("คณะ", { exact: true })).toHaveValue("");
  });

  test.describe("มือถือ", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("กรวยและคิวโทรใช้งานได้บนจอมือถือ", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("mobile-header")).toContainText("หน้าแรก");
      await expect(page.getByTestId("funnel-contacted")).toBeVisible();
      await expect(page.getByTestId("funnel-filters").getByLabel("คณะ", { exact: true })).toBeVisible();
      await expect(page.getByTestId("queue-summary")).toBeVisible();
      // แถบล่างยังเป็นงานประจำวันสามอย่างเหมือนเดิม
      await expect(page.getByTestId("mobile-bottom-/queue")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-/")).toHaveCount(0);
    });
  });
});
