import { expect, test } from "@playwright/test";

import { hasCredentials, signedInClient, STORAGE } from "./identities";

/**
 * ใบ 05 — บัญชีเข้าระบบเหลือเท่าที่จำเป็น แต่แถวเจ้าหน้าที่ที่ไม่ผูกบัญชียังเป็นเจ้าของเคสได้
 * และการรวมรายการซ้ำเป็นสิทธิ์ของหัวหน้าทีมเท่านั้น
 */
async function createLead(page: import("@playwright/test").Page, name: string, phone: string) {
  await page.goto("/leads/new");
  await page.getByLabel("ชื่อ–สกุล หรือชื่อ Facebook").fill(name);
  await page.getByLabel("เบอร์โทร").fill(phone);
  await page.getByRole("button", { name: "บันทึกผู้สนใจ" }).click();
  await expect(page).toHaveURL(/\/leads$/);
}

test.describe("บัญชีและสิทธิ์รวมรายการ", () => {
  test("เจ้าหน้าที่ที่ไม่มีบัญชีเข้าระบบยังเป็นเจ้าของเคส และกรองตามคนนั้นได้", async ({ page }) => {
    const client = await signedInClient("lead");
    // แถวเจ้าหน้าที่ที่ไม่ผูกบัญชี และมีเคสอยู่ — อ่านจากฐานข้อมูล ไม่ผูกกับชื่อใดชื่อหนึ่ง
    const { data: owners, error } = await client
      .from("staff")
      .select("id, display_name, people!people_owner_id_fkey(count)")
      .is("auth_user_id", null)
      .eq("is_active", true);
    expect(error).toBeNull();
    const owner = (owners ?? []).find((row) => (row.people as unknown as { count: number }[])[0]?.count > 0);
    test.skip(!owner, "ยังไม่มีเจ้าหน้าที่ที่ไม่ผูกบัญชีและมีเคส");

    await page.goto("/leads");
    await page.getByLabel("ผู้ดูแล", { exact: true }).selectOption(owner!.id);
    await page.waitForURL(/[?&]ownerId=/);
    await expect(page.getByTestId("lead-rows").locator("tr").first()).toContainText(owner!.display_name);
  });

  test.describe("เจ้าหน้าที่ที่ไม่ใช่หัวหน้าทีม", () => {
    test.skip(!hasCredentials("staff"), "รัน npm run e2e:accounts ก่อน");
    test.use({ storageState: STORAGE.staff });

    test("กดรวมรายการซ้ำแล้วได้ข้อความบอกว่าเป็นสิทธิ์หัวหน้าทีม และไม่มีอะไรหาย", async ({ page }) => {
      const stamp = Date.now();
      const phone = `08${String(stamp).slice(-8)}`;
      const keep = `เก็บไว้สิทธิ์ ${stamp}`;
      const other = `ไม่ถูกรวม ${stamp}`;

      await createLead(page, other, phone);
      await createLead(page, keep, phone);

      await page.goto(`/leads?q=${encodeURIComponent(keep)}`);
      await page.getByRole("link", { name: keep }).click();
      await page.waitForURL(/\/leads\/[0-9a-f-]+$/);

      await page.getByTestId("find-duplicates").click();
      const item = page.getByTestId("duplicate-list").locator("li", { hasText: other });
      await item.getByRole("button", { name: "รวมเข้ามา" }).click();

      await expect(page.getByText("รวมข้อมูลได้เฉพาะหัวหน้าทีม")).toBeVisible();
      await page.goto(`/leads?q=${encodeURIComponent(other)}`);
      await expect(page.getByRole("link", { name: other })).toBeVisible();
    });
  });
});
