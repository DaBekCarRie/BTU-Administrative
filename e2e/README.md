# e2e

รันกับ production build บนพอร์ต 3100 และ**รันกับฐานข้อมูลของโปรเจกต์จริง** — ข้อมูลทดสอบไม่ถูกล้าง

```bash
npm run e2e:accounts   # ครั้งแรกบนเครื่องใหม่ หรือเมื่อบัญชีทดสอบเพี้ยน
npx playwright test
```

## บัญชีทดสอบสามสิทธิ์

กฎสิทธิ์ของระบบพิสูจน์ด้วยบัญชีจริงสามแบบ (ใบ `lockdown-and-extensions/01`)

| สิทธิ์ | ตัวแปรใน `.env.local` | session | เป็นอะไร |
| --- | --- | --- | --- |
| หัวหน้าทีม | `E2E_EMAIL` `E2E_PASSWORD` | `e2e/.auth/user.json` (ค่าตั้งต้นของทุกเทสต์) | แถวเจ้าหน้าที่ role หัวหน้าทีม |
| เจ้าหน้าที่ | `E2E_STAFF_EMAIL` `E2E_STAFF_PASSWORD` | `e2e/.auth/staff.json` | แถวเจ้าหน้าที่ role เจ้าหน้าที่ |
| คนนอกทีม | `E2E_OUTSIDER_EMAIL` `E2E_OUTSIDER_PASSWORD` | `e2e/.auth/outsider.json` | ล็อกอินได้ แต่**ไม่มีแถวเจ้าหน้าที่** |

`npm run e2e:accounts` ต้องมี `SUPABASE_SERVICE_ROLE_KEY` — สร้างบัญชีที่ยืนยันอีเมลแล้ว
ทำให้แถวเจ้าหน้าที่ตรงตามตาราง รันซ้ำได้ ถ้ายังไม่มีรหัสผ่านจะสุ่มแล้วเขียนต่อท้าย `.env.local` ให้

เทสต์ที่ต้องการสิทธิ์อื่นใช้ `test.use({ storageState: STORAGE.staff })` จาก `e2e/identities.ts`
ถ้าต้องยิง API ตรงให้ใช้ `signedInClient("outsider")` และรวบการล็อกอินไว้ใน `beforeAll` ของกลุ่มแบบ serial
ไม่งั้นแต่ละเทสต์ล็อกอินเองจนชน rate limit ของ Supabase Auth
