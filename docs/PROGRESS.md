# ความคืบหน้า

อัปเดตล่าสุด: 12 ก.ย. 2569

## ถึงไหนแล้ว

- **ใบงานทั้ง 15 ใบทำครบ** (`.scratch/core/issues/`) ข้อมูลเดิม 3,177 รายอยู่ในระบบ
- **schema ทั้งหมดอยู่ในไฟล์ migration** 25 ไฟล์ ตรงกับ `schema_migrations` ในฐานข้อมูลจริง
  ชุด 20 ไฟล์แรกพิสูจน์ด้วยการเล่นใหม่บน PostgreSQL 17 เปล่า ๆ แล้ว hash เทียบกับของจริง — เหมือนกันทุก object
- **รัน `/code-review` (mattpocock) แล้ว และซ่อมครบทุก finding ที่ยืนยันว่าจริง** (รายละเอียดด้านล่าง)
- ด่านผ่านหมด: `typecheck` · unit 111 เทสต์ · e2e 69 เทสต์ (รวม RLS 14 ข้อ) · `lint` · `build` · `db:verify` ตรงทุกแถว
- Supabase security advisor เหลือแค่ 3 ฟังก์ชัน SECURITY DEFINER ที่ตั้งใจ (มี comment อธิบายในฐานข้อมูล)
  กับ Leaked Password Protection ที่ต้องเปิดใน Dashboard เอง

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

- **e2e รันกับโปรเจกต์จริงและทิ้งข้อมูลทดสอบไว้** ตอนนี้ `people` มี 3,244 แถว (จริง 3,177) ชื่อทดสอบขึ้นต้นด้วย prefix จาก `uniqueName()`
  ถ้าจะล้าง ให้เช็ค pattern กับข้อมูลจริงก่อนทุกครั้ง — เคยมี regex ไปโดนชื่อจริง "Weerapong Sa-arnwong" มาแล้ว
- `npm run db:types` ยังใช้ไม่ได้จนกว่าจะ `supabase login` + `link` — ตอนนี้ generate ผ่าน MCP แล้ว format ด้วย prettier แทน

## ต้องทำเองในมือ

- ตั้ง `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local` (ใช้เฉพาะ `scripts/`)
- เปิด Leaked Password Protection ใน Supabase Dashboard → Authentication
- สร้างบัญชีให้เจ้าหน้าที่ 5 คน แล้วผูก `staff.auth_user_id`
- `npx supabase login` แล้ว `npx supabase link --project-ref encpmkhwxctcvcytfmuo` เพื่อให้ `npm run db:types` ใช้ได้
