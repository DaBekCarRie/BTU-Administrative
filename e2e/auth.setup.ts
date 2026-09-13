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
  // ล็อกอิน → redirect → render คิวโทร ใช้เกือบ 4 วินาทีตอน server เพิ่งเปิด
  // timeout มาตรฐาน 5 วินาทีทำให้ทั้งชุดล้มเป็นช่วง ๆ ทั้งที่ล็อกอินได้ปกติ
  await expect(page).toHaveURL(/\/queue/, { timeout: 20_000 });

  await page.context().storageState({ path: STORAGE_STATE });
});
