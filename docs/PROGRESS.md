# ความคืบหน้า

อัปเดตล่าสุด: 12 ก.ย. 2569

## ถึงไหนแล้ว

- **ใบงานทั้ง 15 ใบทำครบ** (`.scratch/core/issues/`) ข้อมูลเดิม 3,177 รายอยู่ในระบบ
- **schema ทั้งหมดอยู่ในไฟล์ migration แล้ว** 22 ไฟล์ ตรงกับ `schema_migrations` ในฐานข้อมูลจริง
  พิสูจน์ด้วยการเล่นทั้งชุดใหม่บน PostgreSQL 17 เปล่า ๆ แล้ว hash เทียบกับของจริง — เหมือนกันทุก object
- **รัน `/code-review` (mattpocock) แล้ว** สองแกน Standards + Spec ผลอยู่ด้านล่าง
- ด่านผ่านหมด: `typecheck` · unit 104 เทสต์ · `lint` · `build`

## ซ่อมจาก code review แล้ว

| ข้อ | ที่ | แก้ยังไง |
|---|---|---|
| 🔴 `read_national_id` / `set_national_id` เช็คแค่ล็อกอิน ไม่เช็คว่าเป็นเจ้าหน้าที่ที่ใช้งานอยู่ — ปิดการใช้งานเจ้าหน้าที่แล้วยังอ่านเลขบัตรได้ | migration `20260912014716` | ต้อง `current_staff_id()` ไม่ว่าง ทดสอบบนฐานข้อมูลจริงแล้วว่าปฏิเสธ |
| 🔴 บันทึกโทรย้อนหลังทับสถานะด้วยผลของสายที่เก่ากว่า (story 7) | `src/lib/data/people.ts` · `isBackdated()` ในโมดูลโดเมน | ถ้าเหตุการณ์เกิดก่อนเหตุการณ์ล่าสุด ให้เล่นใหม่ทั้งเส้นแทนการพับทับ + 4 unit test |
| 🔴 `merge_people` ลบคนแล้ว `document_access_log` หายตาม cascade | migration `20260912014716` | ย้ายแถว log ไปอยู่กับรายการที่เหลือรอดก่อนลบ |
| กระดานงานค้าง: story 52 ไม่แตะ `payments` · story 53 นับใบสมัครแทนคน · `.limit(1000)` ตัดเงียบ | migration `20260912014917` + `src/lib/data/work-board.ts` | ย้ายไปนับใน SQL function `work_board_counts()` เกณฑ์ยังส่งจาก TypeScript |
| รายการสถานะ "ปิดเคส" ประกาศซ้ำ 4 ที่ | `src/lib/domain/events.ts` | export `CLOSED_STATUSES` เป็นแหล่งเดียว (ผู้เรียกใน `call-queue.ts` และหน้า detail ยังไม่ได้เปลี่ยนมาใช้) |
| `npm run db:types` พังแล้วลบไฟล์ types ทิ้ง | `package.json` | เขียนลง `.tmp` ก่อน สำเร็จค่อย `mv` |

## ยังไม่ได้ซ่อม (ยืนยันแล้วว่าจริง)

**Standards**
- `+543` นอก `@/lib/date` — `applications-panel.tsx:51`, `exam-panel.tsx:25`
- `QueueRow` ประกาศ type ตารางเอง — `src/lib/data/call-queue.ts:30`
- `openDocument(..., sensitive)` ให้ผู้เรียกตัดสินเองว่าอ่อนไหวไหม และ insert log ไม่เช็ค error — `documents/actions.ts:94-98`
- `docs/STACK.md` บอก `pnpm` แต่ใช้ npm
- กลิ่นโค้ด: `CallOutcome` ประกาศซ้ำใน `normalize.ts` · `text(formData, key)` ซ้ำ 5 ไฟล์ · offset เวลาไทยเขียนมือใน `call-queue.ts` · `describe()` switch บน string เปล่า · `createAdminClient()` ไม่มีคนเรียก · `${4}` ใน `queue/page.tsx:181`

**Spec**
- event `ส่งเอกสาร` / `ตรวจเอกสาร` ไม่เคยถูกเขียน — เอกสารไม่โผล่บนไทม์ไลน์ (story 40)
- story 32 แนบสลิป — ใบ 10 ติ๊ก `[x]` ไว้แต่ยังไม่ได้ทำ
- `editLead` ส่งทุกฟิลด์เสมอ ไทม์ไลน์ขึ้น "แก้ 11 ช่อง" ทุกครั้ง (story 58)
- `scripts/import-leads.mts:363` `written += 1` อยู่นอกลูป แถวที่พังกลางคันก็นับว่าสำเร็จ
- RLS ไม่มีเทสต์ ทั้งที่ spec เขียนว่า "เส้นที่ห้ามพลาด"
- เมนู `/students` ยังเป็นหน้าเปล่า

## ข้อที่ review ทัก แต่ตรวจแล้วไม่ใช่บั๊ก

- `facebook_name` เก็บชื่อไทย — คอลัมน์ Facebook ในไฟล์ต้นทางเป็น**เครื่องหมายถูก** ไม่ใช่ชื่อ และหัวคอลัมน์ชื่อคือ "ชื่อผู้สนใจ/ชื่อ Facebook" ค่าที่เก็บจึงถูกแล้ว
- `src/lib/line.ts` เป็น scope creep — spec เขียนไว้เองใน Out of Scope ว่า "วางโครงไว้แล้วแต่ยังไม่เปิดใช้"

## ต้องทำเองในมือ

- ตั้ง `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local`
- เปิด Leaked Password Protection ใน Supabase Dashboard → Authentication
- สร้างบัญชีให้เจ้าหน้าที่ 5 คน แล้วผูก `staff.auth_user_id`
- `npx supabase login` แล้ว `npx supabase link --project-ref encpmkhwxctcvcytfmuo` เพื่อให้ `npm run db:types` ใช้ได้
