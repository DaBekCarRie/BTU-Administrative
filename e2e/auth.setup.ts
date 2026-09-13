import { expect, test as setup, type Page } from "@playwright/test";

import { CREDENTIALS, hasCredentials, STORAGE, type Role } from "./identities";

/** คงไว้ให้ไฟล์เดิมที่ import ชื่อนี้ — เป็น session ของหัวหน้าทีม */
export const STORAGE_STATE = STORAGE.lead;

/**
 * ล็อกอินครั้งเดียวต่อสิทธิ์แล้วเก็บ session ไว้ให้ทุกเทสต์ใช้ร่วมกัน
 * ถ้าให้แต่ละเทสต์ล็อกอินเอง จะยิง auth endpoint หลายสิบครั้งต่อรอบจน Supabase rate limit
 */
async function login(page: Page, role: Role) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(CREDENTIALS[role].email!);
  await page.getByLabel("รหัสผ่าน").fill(CREDENTIALS[role].password!);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
}

setup("ล็อกอินหัวหน้าทีมเก็บ session ไว้ใช้ร่วมกัน", async ({ page }) => {
  await login(page, "lead");
  // ล็อกอิน → redirect → render คิวโทร ใช้เกือบ 4 วินาทีตอน server เพิ่งเปิด
  // timeout มาตรฐาน 5 วินาทีทำให้ทั้งชุดล้มเป็นช่วง ๆ ทั้งที่ล็อกอินได้ปกติ
  await expect(page).toHaveURL(/\/queue/, { timeout: 20_000 });
  await page.context().storageState({ path: STORAGE.lead });
});

setup("ล็อกอินเจ้าหน้าที่เก็บ session ไว้ใช้ร่วมกัน", async ({ page }) => {
  setup.skip(!hasCredentials("staff"), "รัน npm run e2e:accounts ก่อน");
  await login(page, "staff");
  await expect(page).toHaveURL(/\/queue/, { timeout: 20_000 });
  await page.context().storageState({ path: STORAGE.staff });
});

setup("ล็อกอินคนนอกทีมเก็บ session ไว้ใช้ร่วมกัน", async ({ page }) => {
  setup.skip(!hasCredentials("outsider"), "รัน npm run e2e:accounts ก่อน");
  await login(page, "outsider");
  // ล็อกอินได้ แต่ไม่มีแถวเจ้าหน้าที่ — ถูกส่งกลับหน้าเข้าสู่ระบบพร้อมบอกว่ายังไม่มีสิทธิ์
  // session ยังอยู่ ซึ่งคือสิ่งที่เทสต์สิทธิ์ต้องการ: คนที่ถือ session แต่ไม่ใช่เจ้าหน้าที่
  await expect(page).toHaveURL(/\/login\?error=no-staff/, { timeout: 20_000 });
  await expect(page.getByTestId("no-access")).toBeVisible();
  await page.context().storageState({ path: STORAGE.outsider });
});
