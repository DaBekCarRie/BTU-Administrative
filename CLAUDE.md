# btu-admin

ระบบจัดการผู้สนใจและผู้เรียน ของทีม LMS มหาวิทยาลัยกรุงเทพธนบุรี
ผู้ใช้ 5–6 คน · ข้อมูลเริ่มต้น 3,180 ราย · ภาษาไทยล้วน

## อ่านก่อนเขียนโค้ด

- `docs/STACK.md` — คำตัดสินเรื่องเทคโนโลยีทุกข้อ พร้อมเหตุผล
- `docs/PROMPT-design.md` — หน้าจอทั้ง 7 และแนวทางออกแบบ
- `supabase/README.md` — วิธีแก้ schema

## กฎเหล็ก

1. **Schema อยู่ในไฟล์ migration เท่านั้น** ห้ามแก้ผ่าน Supabase Dashboard
   หลังแก้ทุกครั้งให้รัน `npm run db:types` ทันที
2. **ห้ามประกาศ type ของตารางเอง** ใช้ `Database` จาก `@/types/database` เสมอ
3. **ห้ามใช้ ORM** ทุก query ต้องผ่าน Supabase client เพื่อให้ RLS ทำงาน
   `createAdminClient()` ใช้ได้เฉพาะสคริปต์ import เท่านั้น ห้ามใช้เพื่อ "ให้มันผ่าน"
4. **ห้าม free-text ในช่องประเภท** คณะ/สาขา/วุฒิ/สถานะ/ผู้ดูแล ต้องเป็น FK หรือ enum
   และ UI ต้องเป็น dropdown — ระบบเดิมพิมพ์เองแล้วคณะ 10 คณะกลายเป็น 64 ค่า
5. **วันที่เก็บเป็น ค.ศ. (`timestamptz`) เสมอ** แปลงเป็น พ.ศ. ตอนแสดงผลผ่าน
   `@/lib/date` เท่านั้น ห้ามเขียน `+543` กระจายตามหน้าจอ
6. **เบอร์โทรต้องผ่าน `normalizePhone()` ก่อนบันทึกเสมอ**
7. **`tsc --noEmit` ต้องผ่านก่อนบอกว่าเสร็จ**

## ข้อมูลส่วนบุคคล

- เลขบัตรประชาชนเก็บเข้ารหัส (`pgcrypto`) คีย์อยู่ใน Supabase Vault เท่านั้น
  ถอดรหัสผ่าน function `security definer` ที่เช็ค role แล้วเขียน `audit_log` ทุกครั้ง
- หน้าจอปกติแสดงแค่ 4 ตัวท้าย
- Storage bucket เป็น private ทั้งหมด เข้าถึงผ่าน signed URL อายุสั้น
- `SUPABASE_SERVICE_ROLE_KEY` ห้ามปรากฏใน Client Component ทุกกรณี

## คำสั่ง

```bash
npm run dev         # เปิดเซิร์ฟเวอร์พัฒนา
npm run typecheck   # ด่านหลักก่อน commit
npm run build
npm run db:types    # generate type หลังแก้ schema
```

## สถานะปัจจุบัน

วางโครงแล้ว ยังไม่ได้พัฒนาฟีเจอร์ใด ๆ — มีเฉพาะ:
โครงเส้นทาง · Supabase client 3 ตัว · middleware กันเส้นทาง ·
ยูทิลิตี้วันที่ พ.ศ. / เบอร์โทร / LINE · ยังไม่มีตารางในฐานข้อมูล

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

issue และ spec เก็บเป็นไฟล์ markdown ใน `.scratch/<feature>/` — repo นี้ยังไม่มี git remote
ดู `docs/agents/issue-tracker.md`

### Triage labels

ใช้ค่ามาตรฐานทั้ง 5: `needs-triage` `needs-info` `ready-for-agent` `ready-for-human` `wontfix`
ดู `docs/agents/triage-labels.md`

### Domain docs

แบบ single-context — `CONTEXT.md` ที่ root และ ADR ใน `docs/adr/`
ดู `docs/agents/domain.md`
