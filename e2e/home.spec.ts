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

  test.describe("มือถือ", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("กรวยและคิวโทรใช้งานได้บนจอมือถือ", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("mobile-header")).toContainText("หน้าแรก");
      await expect(page.getByTestId("funnel-contacted")).toBeVisible();
      await expect(page.getByTestId("queue-summary")).toBeVisible();
      // แถบล่างยังเป็นงานประจำวันสามอย่างเหมือนเดิม
      await expect(page.getByTestId("mobile-bottom-/queue")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-/")).toHaveCount(0);
    });
  });
});
