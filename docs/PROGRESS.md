# ความคืบหน้า

อัปเดตล่าสุด: 13 ก.ย. 2569

## ถึงไหนแล้ว

- **ใบงานทั้ง 15 ใบทำครบ** (`.scratch/core/issues/`)
- **ข้อมูลในระบบเป็นข้อมูลสมมติ 3,177 ราย** นำเข้าจาก `data/leads-mock.csv` (ใบ 04 ของ `lockdown-and-extensions`)
  ข้อมูลจริงอยู่ในไฟล์สำรองนอก repo — ดู "นำข้อมูลจริงกลับเข้าระบบ" ด้านล่าง
- **schema ทั้งหมดอยู่ในไฟล์ migration** 25 ไฟล์ ตรงกับ `schema_migrations` ในฐานข้อมูลจริง
  ชุด 20 ไฟล์แรกพิสูจน์ด้วยการเล่นใหม่บน PostgreSQL 17 เปล่า ๆ แล้ว hash เทียบกับของจริง — เหมือนกันทุก object
- **รัน `/code-review` (mattpocock) แล้ว และซ่อมครบทุก finding ที่ยืนยันว่าจริง** (รายละเอียดด้านล่าง)
- **เพิ่มระบบ Google OAuth** ปุ่มลงชื่อเข้าใช้ด้วย Google, callback route ตรวจสิทธิ์ staff ก่อนปล่อยเข้า พร้อม e2e test
- ด่านผ่านหมด: `typecheck` · unit 111 เทสต์ · e2e 70 เทสต์ (รวม RLS 14 ข้อ) · `lint` · `build` · `db:verify` ตรงทุกแถว
- Supabase security advisor เหลือแค่ 3 ฟังก์ชัน SECURITY DEFINER ที่ตั้งใจ (มี comment อธิบายในฐานข้อมูล)
  กับ Leaked Password Protection ที่ติดข้อจำกัดของ Free tier (ต้องเป็น Pro plan ขึ้นไป — ปล่อยไว้ได้ ไม่กระทบการทำงาน)

## ซ่อมจาก code review แล้ว (ครบ)

### Standards

| ข้อ | แก้ยังไง |
|---|---|
| 🔴 `read_national_id` / `set_national_id` เช็คแค่ล็อกอิน — ปิดการใช้งานเจ้าหน้าที่แล้วยังอ่านเลขบัตรได้ | migration `20260912014716` ต้อง `current_staff_id()` ไม่ว่าง ทดสอบบนฐานข้อมูลจริงว่าปฏิเสธ |
| `+543` นอก `@/lib/date` สองที่ | `thaiYearNow()` |
| `QueueRow` ประกาศ type ตารางเอง | `Pick<Tables<"people_with_call_summary">, …>` ต่อยอดจากที่ generate |
| `openDocument(..., sensitive)` ให้ผู้เรียกตัดสิน + insert log ไม่เช็ค error | อ่าน doc_type/path จากแถวในฐานข้อมูลเอง log พังแล้วไม่ให้ลิงก์ (fail closed) |
| STACK.md บอก pnpm / Biome / Sentry | แก้ให้ตรงของจริง: npm / ESLint+Prettier / Sentry ยังไม่ติดตั้ง |
| สถานะปิดเคสประกาศซ้ำ 4 ที่ | `CLOSED_STATUSES` + `isClosed()` ที่เดียวในโมดูลโดเมน |
| `normalize.ts` ประกาศ type ซ้ำ 4 ตัว | import จากโมดูลโดเมน |
| `text(formData, key)` ซ้ำ 5 ไฟล์ | `@/lib/form` |
| offset เวลาไทยคูณเลขมือ 2 ที่ | `startOfTodayBangkok()` / `endOfTodayBangkok()` ใน `@/lib/date` และ SQL `at time zone` |
| `describe()` switch บน string เปล่า | switch บน `Enums<"event_type">` ครบทุกชนิด มี `never` check |
| `createAdminClient()` ไม่มีคนเรียก | ลบ และเอา service role key ออกจาก `serverEnv()` — เดิม `required()` ไว้ทำให้ cron route พัง 500 |
| `${4}` | `DOC_TYPES.length` |

### Spec

| ข้อ | แก้ยังไง |
|---|---|
| 🔴 บันทึกโทรย้อนหลังทับสถานะด้วยผลของสายที่เก่ากว่า (story 7) | `recordEvent` เล่นใหม่ทั้งเส้นเมื่อ `isBackdated()` + 4 unit test |
| 🔴 `merge_people` ลบคนแล้ว `document_access_log` หายตาม cascade (story 38) | ย้ายแถว log ไปรายการที่เหลือรอดก่อนลบ |
| กระดานงานค้าง: story 52 ไม่แตะ `payments` · story 53 นับใบสมัครแทนคน · `.limit(1000)` | SQL function `work_board_counts()` migration `20260912014917` |
| `ส่งเอกสาร` / `ตรวจเอกสาร` ไม่เคยถูกเขียน — เอกสารไม่ขึ้นไทม์ไลน์ (story 40) | เพิ่มในโดเมน + from-db + action เขียน event ทุกครั้งที่อัปโหลด/ตรวจ |
| story 32 แนบสลิป — ใบ 10 ติ๊ก `[x]` ไว้แต่ไม่ได้ทำ | ช่องแนบสลิปในฟอร์มชำระ อัปโหลดจากเบราว์เซอร์ → `payments.slip_path` → ปุ่ม "เปิดสลิป" + event `ชำระเงิน` พก `slipPath` |
| `editLead` ส่งทุกฟิลด์ ไทม์ไลน์ขึ้น "แก้ 11 ช่อง" (story 58) | `diffDetails()` ส่งเฉพาะที่เปลี่ยน ไทม์ไลน์บอก "แก้ ชื่อเล่น · เบอร์โทร" ไม่เปลี่ยนอะไรก็ไม่บันทึก |
| `import-leads.mts` นับแถวที่พังกลางคันว่าสำเร็จ | นับแยก written/failed และ exit code 1 ถ้ามีพัง |
| RLS ไม่มีเทสต์ทั้งที่ spec ว่า "เส้นที่ห้ามพลาด" | `e2e/rls.spec.ts` ยิง anon key ตรงเข้า PostgREST 10 ตาราง + view + 2 RPC + bucket |
| เมนู `/students` เป็นหน้าเปล่า ไม่อยู่ใน 7 หน้าจอ | ถอดออก |

### ข้อที่ review ทัก แต่ตรวจแล้วไม่ใช่บั๊ก (ไม่แก้)

- `facebook_name` เก็บชื่อไทย — คอลัมน์ Facebook ในไฟล์ต้นทางเป็น**เครื่องหมายถูก** ไม่ใช่ชื่อ และหัวคอลัมน์ชื่อคือ "ชื่อผู้สนใจ/ชื่อ Facebook" ค่าที่เก็บจึงถูกแล้ว
- `src/lib/line.ts` เป็น scope creep — spec เขียนไว้เองใน Out of Scope ว่า "วางโครงไว้แล้วแต่ยังไม่เปิดใช้"

### เพิ่มเติมจาก advisor (ไม่ใช่ finding ของ review)

- migration `20260912023956`: index ให้ FK 5 ตัวที่แอปกรองจริง และห่อ `auth.uid()` ใน policy ด้วย `(select …)`
- ที่เหลือใน performance advisor ทราบแล้วแต่ไม่ทำ: FK ที่ไม่เคยถูกกรอง 11 ตัว, index ที่ยังไม่ถูกใช้ (ข้อมูล 3 พันแถว ยังไม่มีอะไรบอกว่าจำเป็น), policy ซ้อนกัน 4 คู่ (admin + select — ผู้ใช้ 6 คน ไม่มีผล)

## ข้อควรระวัง

- **e2e รันกับโปรเจกต์จริงและทิ้งข้อมูลทดสอบไว้** นอกจาก 3,177 รายจากไฟล์สมมติ ชื่อทดสอบขึ้นต้นด้วย prefix จาก `uniqueName()`
  ถ้าจะล้าง ให้เช็ค pattern กับข้อมูลจริงก่อนทุกครั้ง — เคยมี regex ไปโดนชื่อคนจริงมาแล้ว
- `npm run db:types` ใช้งานได้แล้ว (supabase CLI ลิงก์โปรเจกต์และ generate types สำเร็จแล้ว)

## ต้องทำเองในมือ

- [x] ตั้ง `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local` (ใช้เฉพาะ `scripts/`)
- [x] ตั้งค่า Google Cloud Console: สร้าง OAuth Client ID (Web application) ใส่ Authorized redirect URI: `https://encpmkhwxctcvcytfmuo.supabase.co/auth/v1/callback`
- [x] ใส่ Client ID / Secret ใน Supabase Dashboard → Authentication → Providers → Google
      (ตรวจ 13 ก.ย. 2569: `/auth/v1/settings` รายงาน provider Google เปิดอยู่ ซึ่งเปิดไม่ได้ถ้าไม่มี Client ID)
- [x] Leaked Password Protection: Free plan ไม่รองรับ (เป็นฟีเจอร์ Pro) — ข้ามได้
- [ ] ~~สร้างบัญชีให้เจ้าหน้าที่ 5 คน~~ **ไม่ตรงความจริง** — บัญชีเหล่านั้นเป็นโดเมนสมมติ `@btu-admin.dev`
      ไม่มีเจ้าหน้าที่คนไหนใช้จริง ถูกลบในใบ 05 (13 ก.ย. 2569) แถวเจ้าหน้าที่ยังอยู่และยังเป็นเจ้าของเคส
      เจ้าหน้าที่จริงยังไม่มีบัญชี — เพิ่มทีละคนตาม "เพิ่มเจ้าหน้าที่" ด้านล่าง
- [ ] หัวหน้าทีมลองลงชื่อเข้าใช้ด้วย Google ครั้งแรก (บัญชีเตรียมไว้แล้วด้วย `npm run accounts:lead`)
- [ ] ปิดการสมัครใหม่บน Dashboard (ด้านล่าง)
- [x] `npx supabase link` เรียบร้อยแล้ว — `npm run db:types` ใช้งานได้สมบูรณ์

## ปิดการสมัครบัญชีใหม่ (ใบ 05)

ด่านที่ฐานข้อมูล (ADR-0005) กันคนนอกไม่ให้เห็นข้อมูลอยู่แล้ว แต่ยังควรปิดไม่ให้มีบัญชีงอกขึ้นมา

1. Supabase Dashboard → โปรเจกต์ `btu-admin` → **Authentication → Sign In / Providers**
2. ปิด **Allow new users to sign up** แล้วกด Save
3. ตรวจ: เปิดหน้าเข้าสู่ระบบในหน้าต่างส่วนตัว กด Google ด้วยบัญชีที่ไม่อยู่ในระบบ ต้องเข้าไม่ได้
   บัญชีที่มีอยู่แล้ว (รวมหัวหน้าทีมที่ผูก Google) ยังเข้าได้ตามปกติ

### เพิ่มเจ้าหน้าที่ใหม่ (ไม่ต้องเปิดการสมัคร)

บัญชีที่สร้างด้วย service role ไม่ติดสวิตช์ปิดการสมัคร จึงไม่ต้องเปิดชั่วคราว
แก้ `scripts/setup-lead-account.mts` ให้รับ role ได้ หรือทำมือบน Dashboard:

1. **Authentication → Users → Add user → Create new user** ใส่อีเมล Google ของเจ้าหน้าที่ ติ๊ก Auto Confirm
2. **Table Editor → staff**: ถ้ามีแถวชื่อนั้นอยู่แล้ว (เป็นเจ้าของเคสอยู่) ใส่ `auth_user_id` ของบัญชีใหม่ในแถวเดิม
   ไม่งั้นเพิ่มแถวใหม่ role `staff` — **อย่าสร้างแถวซ้ำ** เคสเดิมจะไม่ตามไป
3. ให้เจ้าหน้าที่กด Google ด้วยอีเมลนั้น

ถ้าจำเป็นต้องให้สมัครเองจริง ๆ ค่อยเปิดสวิตช์ในข้อ 2 ข้างบนชั่วคราว แล้วปิดทันทีหลังผูกแถวเจ้าหน้าที่

## นำข้อมูลจริงกลับเข้าระบบ (ใบ 04)

ข้อมูลจริงถูกถอดออกเมื่อ 13 ก.ย. 2569 สำรองไว้ที่ `~/btu-admin-backup-20260913/` ในเครื่องหัวหน้าทีม
(ชีทต้นฉบับ CSV + xlsx · `database/` JSON ทุกตาราง + ไฟล์ Storage + `manifest.json`)
**ห้ามย้ายโฟลเดอร์นี้เข้า repo หรือที่ซิงก์คลาวด์** — มีสำเนาบัตรประชาชนจริง

ทางที่แนะนำ — นำเข้าจากชีทใหม่ (สะอาดที่สุด ไม่มีแถวทดสอบค้าง):

```bash
npm run db:backup -- --out ~/btu-admin-backup-<วันที่>     # สำรองสภาพปัจจุบันก่อนเสมอ
npm run db:reset-to-mock -- --skip-staff-rename           # ดูจำนวนที่จะลบ
npm run db:reset-to-mock -- --skip-staff-rename --confirm # ลบคน/เหตุการณ์/เอกสารรายคน ไม่แตะชื่อเจ้าหน้าที่
npm run import:leads -- --file "<ชีทจริง>.csv" --dry-run   # ตัวเลขต้องตรงกับที่เคยนำเข้า
npm run import:leads -- --file "<ชีทจริง>.csv"
npm run db:verify
```

**ชื่อเจ้าหน้าที่ต้องกลับเป็นชื่อจริงก่อนนำเข้า** ไม่งั้นช่องผู้ดูแลจับคู่ไม่ได้ทั้งหมด —
แก้ `staff.display_name` ย้อนตาราง `owners` ใน `scripts/mock-staff.local.json` (ชื่อจริง → ชื่อสมมติ)
หรือเทียบกับ `staff.json` ในไฟล์สำรอง (id เดิม — ใช้ทางนี้บนเครื่องที่ไม่มีไฟล์ local นั้น)
`--skip-staff-rename` ทำให้สคริปต์ไม่ต้องใช้ไฟล์ตารางชื่อเลย

ที่ชีทไม่มีและต้องกู้จากไฟล์สำรองถ้าต้องการ: การสมัคร การชำระเงิน เอกสารรายคนและไฟล์
คำขอศูนย์สอบ ร่องรอยการเปิดดู เลขบัตรที่เข้ารหัส — ตรวจไฟล์สำรองแล้ว **ไม่มีสักแถวที่ผูกกับคนจากชีท**
ทั้งหมดผูกกับ 739 รายที่สร้างหลังนำเข้า (แถวทดสอบ e2e และที่กรอกทดลองผ่านหน้าจอ) ชีทจึงเป็นแหล่งเดียวที่ต้องใช้
ถ้าต้องกู้ส่วนนั้นจริง ข้อมูลอยู่ใน `database/*.json` และ `database/storage/documents/`
