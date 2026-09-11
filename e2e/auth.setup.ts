import { expect, test as setup } from "@playwright/test";

export const STORAGE_STATE = "e2e/.auth/user.json";

/**
 * ล็อกอินครั้งเดียวแล้วเก็บ session ไว้ให้ทุกเทสต์ใช้ร่วมกัน
 * ถ้าให้แต่ละเทสต์ล็อกอินเอง จะยิง auth endpoint หลายสิบครั้งต่อรอบจน Supabase rate limit
 */
setup("ล็อกอินเก็บ session ไว้ใช้ร่วมกัน", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("รหัสผ่าน").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/queue/);

  await page.context().storageState({ path: STORAGE_STATE });
});
