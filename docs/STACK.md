# Stack — ระบบผู้สนใจ–ผู้เรียน BTU

เอกสารนี้เป็น "คำตัดสิน" ไม่ใช่ "ตัวเลือก" ทุกข้อเลือกมาแล้ว พร้อมเหตุผล
ให้เครื่องมือ vibe code อ่านไฟล์นี้ก่อนเขียนโค้ดทุกครั้ง

**เงื่อนไขที่ใช้ตัดสินใจทุกข้อ**
ผู้ใช้ 5–6 คน · ข้อมูลเริ่มต้น 3,180 แถว โต ~500 คน/ปี · ภาษาไทยล้วน ·
ทีมทำงานบนมือถือและอยู่ใน LINE ทั้งวัน · มีเลขบัตรประชาชนและเอกสารส่วนบุคคล ·
มีคนดูแลระบบคนเดียว · ต้องให้ AI เขียนโค้ดได้แม่น

---

## สรุปคำตัดสิน

| ชั้น | เลือก | เหตุผลสั้น |
|---|---|---|
| ภาษา | TypeScript (strict) | เป็นราวกันตกของ vibe code |
| Framework | Next.js App Router | ข้อมูลเทรน AI เยอะสุด deploy ที่เดียวจบ |
| UI | Tailwind + shadcn/ui | คัดลอกเข้าโปรเจกต์ ไม่ใช่ dependency ที่พังตามเวอร์ชัน |
| ตาราง | TanStack Table v8 | 3,180 แถว ต้อง sort/filter/paginate ฝั่ง server ได้ |
| ฟอร์ม | react-hook-form + zod | zod schema ใช้ซ้ำได้ทั้ง client และ server action |
| วันที่ | dayjs + plugin buddhistEra | ต้องแสดง พ.ศ. — date-fns ทำไม่ได้ตรง ๆ |
| ฐานข้อมูล | Supabase (Postgres) | RLS คือชั้นสิทธิ์จริง ไม่ใช่ if ในโค้ด |
| เข้าถึงข้อมูล | Supabase JS client เท่านั้น (ไม่มี ORM) | ดูหัวข้อ "ทำไมไม่ใช้ ORM" |
| ค้นหา | pg_trgm + GIN index | Postgres ตัดคำไทยไม่ได้ trigram แก้ปัญหานี้ |
| ไฟล์ | Supabase Storage (private) | ต้องการ signed URL + RLS ในระบบเดียวกัน |
| Auth | Supabase Auth (email + password) | ทีมเล็ก ไม่ต้อง SSO |
| Deploy | Vercel | preview deploy ต่อ branch ช่วยตรวจงานก่อนขึ้นจริง |
| งานตามเวลา | Vercel Cron | อยู่ใน repo เดียวกัน debug ง่ายกว่า pg_cron |
| แจ้งเตือน | LINE Messaging API (OA @btubkkthon) | ทีมอยู่ใน LINE ระบบต้องไปหาเขา |
| ดักข้อผิดพลาด | Sentry (free) — **ยังไม่ติดตั้ง** | คนดูแลคนเดียว ต้องรู้ก่อนผู้ใช้โทรมาบ่น |
| ตรวจโค้ด | ESLint (eslint-config-next) + Prettier | มากับ create-next-app ไม่ต้องตั้งเพิ่ม |
| แพ็กเกจ | npm + Node 24 | มากับ Node ไม่ต้องติดตั้งเพิ่ม lockfile คือ package-lock.json |

> **ตรึงเวอร์ชันตอนเริ่มโปรเจกต์เสมอ** อย่าเขียน `latest` ในไฟล์ไหนทั้งสิ้น
> เวอร์ชันที่ระบุในเอกสารนี้อาจไม่ใช่ตัวล่าสุดแล้ว ให้เช็คตอนติดตั้งแล้วตรึงเลขจริงลงไป

---

## 1. ชั้นข้อมูล — Supabase

**Postgres + RLS + Auth + Storage ในระบบเดียว** เหตุผลหลักไม่ใช่ความสะดวก
แต่เป็นเรื่องสิทธิ์: RLS อ่าน `auth.uid()` ได้โดยตรง แปลว่า "แอดมินเห็นเฉพาะ lead ของตัวเอง"
เป็นกฎที่อยู่ในฐานข้อมูล ไม่ใช่ `if` ในโค้ดหน้าเว็บที่ลืมใส่ที่ไหนก็รั่วที่นั่น

### ทำไมไม่ใช้ ORM (Prisma / Drizzle)

เพราะ ORM ต่อฐานข้อมูลด้วย connection string ที่เป็น service role ซึ่ง **ข้าม RLS ทั้งหมด**
ถ้าใช้ ORM ชั้นสิทธิ์จะย้ายกลับไปอยู่ในโค้ดแอป ซึ่งคือสิ่งที่เรากำลังหนี
ใช้ `@supabase/supabase-js` ทางเดียว ให้ทุก query วิ่งผ่าน RLS เสมอ

ผลพลอยได้: schema มีแหล่งเดียว (migration SQL) ไม่ต้องซิงก์ schema.prisma กับ Postgres

### Migration และ type

```
supabase/migrations/*.sql     ← schema ทั้งหมดอยู่ในไฟล์ เช็คอินเข้า git
src/types/database.ts         ← generate จาก Supabase อย่าแก้ด้วยมือ
```

```bash
supabase migration new add_leads_table
supabase db push
supabase gen types typescript --linked > src/types/database.ts
```

**ห้ามแก้ schema ผ่านหน้า Dashboard** เพราะ AI อ่านไฟล์ในโปรเจกต์ ไม่เห็นหน้าเว็บ
ถ้าแก้ใน Dashboard โค้ดกับฐานข้อมูลจะเริ่มไม่ตรงกันเงียบ ๆ

### ส่วนขยายที่ต้องเปิด

```sql
create extension if not exists pgcrypto;   -- เข้ารหัสเลขบัตรประชาชน
create extension if not exists pg_trgm;    -- ค้นหาภาษาไทย
```

---

## 2. ค้นหาภาษาไทย — จุดที่พลาดกันบ่อย

Postgres full-text search **ตัดคำไทยไม่ได้** เพราะภาษาไทยไม่เว้นวรรคระหว่างคำ
ถ้าใช้ `to_tsvector` ตามปกติ ค้น "ศิริ" จะไม่เจอ "ศิริพร"

ทางแก้คือ trigram:

```sql
create index leads_name_trgm on leads using gin (full_name gin_trgm_ops);
create index leads_fb_trgm   on leads using gin (facebook_name gin_trgm_ops);
```

```sql
select * from leads
where full_name ilike '%' || :q || '%'
   or facebook_name ilike '%' || :q || '%'
   or phone like :q || '%'
order by similarity(full_name, :q) desc
limit 50;
```

ข้อมูลจริงมีชื่อปนไทย-อังกฤษ (`Nithi Yomyai`, `ตุ๊กติ๊ก ตุ๊กติ๊ก`, `Benz Apichaya`)
trigram รองรับทั้งสองแบบด้วย index ชุดเดียว

ที่ขนาด 3,180 แถว วิธีนี้เร็วเกินพอ — ยังไม่ต้องแตะ Algolia/Typesense

---

## 3. ความปลอดภัยข้อมูลส่วนบุคคล

### เลขบัตรประชาชน

```sql
-- เก็บ: เข้ารหัสด้วยคีย์จาก Supabase Vault
national_id_enc    bytea,        -- pgp_sym_encrypt(...)
national_id_last4  text          -- ไว้แสดงและค้นหา
```

ถอดรหัสผ่าน function `security definer` ที่เช็ค role แล้ว **เขียน audit_log ทุกครั้ง**
ไม่มีทางอื่นที่ถอดได้ หน้าเว็บปกติเห็นแค่ 4 ตัวท้าย

คีย์อยู่ใน **Supabase Vault** เท่านั้น — ห้ามใส่ `.env`, ห้าม hardcode,
ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_` เด็ดขาด

### ไฟล์เอกสาร

- Bucket ต้อง **private** ทั้งหมด
- เข้าถึงผ่าน signed URL อายุ 60 วินาที สร้างจากฝั่ง server เท่านั้น
- ทุกครั้งที่สร้าง signed URL ของสำเนาบัตรประชาชน → เขียน audit_log

### บีบอัดรูปก่อนอัปโหลด (สำคัญเรื่องค่าใช้จ่าย)

แอดมินถ่ายรูปเอกสารจากมือถือ ได้ไฟล์ 3–5 MB ต่อใบ
4 ใบ × 500 คน/ปี = 6–10 GB/ปี ซึ่งจะชนเพดาน storage เร็วมาก

ใช้ `browser-image-compression` บีบเหลือ ~300 KB ก่อนส่งขึ้น →
เหลือ ~600 MB/ปี อ่านออกเท่าเดิม

### service_role key

ห้ามปรากฏใน client component ทุกกรณี ใช้ได้เฉพาะใน Route Handler,
Server Action และสคริปต์ import เท่านั้น

---

## 4. ชั้นหน้าเว็บ

```
Next.js App Router
├── Server Component        → ดึงข้อมูลตรงจาก Supabase (RLS ทำงาน)
├── Server Action           → เขียนข้อมูล + revalidate
└── Client Component        → เฉพาะส่วนที่ต้องโต้ตอบ (ตาราง ฟอร์ม dialog)
```

**shadcn/ui** ไม่ใช่ dependency แต่เป็นโค้ดที่คัดลอกเข้าโปรเจกต์
ข้อดีสำหรับโปรเจกต์ที่ดูแลคนเดียว: อัปเดต npm แล้วปุ่มไม่เพี้ยนเอง และ AI แก้ component ได้ตรง ๆ

คอมโพเนนต์ที่ต้องติดตั้ง: `table` `form` `select` `dialog` `sheet` `badge`
`calendar` `popover` `command` `sonner` `tabs` `avatar` `dropdown-menu`

### ฟอนต์

```ts
import { IBM_Plex_Sans_Thai } from "next/font/google";
```
น้ำหนัก 400/500/600 · `display: "swap"` · ใส่ `font-variant-numeric: tabular-nums`
ในคอลัมน์ที่มีตัวเลข (เบอร์โทร รหัสนักศึกษา จำนวนเงิน) เพื่อให้เรียงตรงกัน

### วันที่ พ.ศ.

```ts
import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
dayjs.extend(buddhistEra);
dayjs.locale("th");

dayjs(d).format("D MMM BBBB");   // 11 ก.ย. 2569
```

**กฎ:** ฐานข้อมูลเก็บ ค.ศ. เสมอ (`timestamptz`) แปลงเป็น พ.ศ. ตอนแสดงผลเท่านั้น
อย่าเก็บ พ.ศ. ลงฐานข้อมูลเด็ดขาด

### ตาราง 3,180 แถว

TanStack Table แบบ **server-side** — ส่ง `page` `pageSize` `sort` `filter`
ไปให้ Supabase ประมวลผล อย่าดึงทั้ง 3,180 แถวมาแล้วกรองในเบราว์เซอร์
(ตอนนี้ยังไหว แต่ปีหน้าจะไม่ไหว และแก้ทีหลังเจ็บ)

---

## 5. LINE

**ใช้ Messaging API ผ่าน Official Account `@btubkkthon` ที่มีอยู่แล้ว**
(LINE Notify ตัวเก่าปิดบริการไปแล้ว ใช้ไม่ได้)

```
Vercel Cron (08:00 ทุกวัน)
   → /api/cron/daily-digest
   → query Supabase: คิวโทรวันนี้ + งานค้าง
   → POST https://api.line.me/v2/bot/message/push
   → กลุ่ม LINE ของทีม
```

ข้อความควรสั้นและมีลิงก์กลับเข้าเว็บ:
```
คิวโทรวันนี้ 12 คน · ค้างเกิน 7 วัน 23 คน · เอกสารรอตรวจ 4
เปิดระบบ → https://…/queue
```

**ต้องเช็คก่อนทำ:** โควตาข้อความของ OA แพ็กเกจปัจจุบัน — การ push เข้ากลุ่มนับเป็นข้อความ
ถ้าโควตาไม่พอให้ลดเหลือวันละครั้งหรืออัปเกรดแพ็กเกจ

Webhook (รับข้อความจากผู้ใช้) **ยังไม่ต้องทำในเฟสแรก**

---

## 6. โครงโปรเจกต์

```
btu-admin/
├── CLAUDE.md                    ← กฎของโปรเจกต์ ให้ AI อ่านทุกครั้ง
├── STACK.md                     ← ไฟล์นี้
├── supabase/
│   ├── migrations/*.sql
│   ├── functions/               ← Edge Function (ถ้าจำเป็น)
│   └── seed.sql                 ← คณะ สาขา วุฒิ
├── scripts/
│   └── import-leads.ts          ← นำเข้า 3,180 แถว + ล้างข้อมูล (มี --dry-run)
└── src/
    ├── app/
    │   ├── (auth)/login/
    │   ├── (app)/queue/         ← คิวโทรวันนี้
    │   ├── (app)/leads/[id]/
    │   ├── (app)/students/
    │   ├── (app)/documents/
    │   ├── (app)/faq/
    │   └── api/cron/daily-digest/
    ├── components/ui/           ← shadcn
    ├── lib/
    │   ├── supabase/{client,server,middleware}.ts
    │   ├── line.ts
    │   └── date.ts              ← พ.ศ. ที่เดียว
    └── types/database.ts        ← generate อย่าแก้มือ
```

---

## 7. ตัวแปรสภาพแวดล้อม

```bash
# ปลอดภัยที่จะเปิดเผย
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# ห้ามหลุดถึง client เด็ดขาด
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_GROUP_ID=
CRON_SECRET=
SENTRY_AUTH_TOKEN=
```

คีย์ถอดรหัสเลขบัตรประชาชน **ไม่อยู่ในรายการนี้** — อยู่ใน Supabase Vault เท่านั้น

---

## 8. ทดสอบ — เอาเท่าที่จำเป็นจริง

โปรเจกต์ภายในผู้ใช้ 6 คน ไม่ต้องมี unit test ครอบคลุม 80% นั่นคือการเสียเวลา
สิ่งที่ต้องมีคือ:

1. **`tsc --noEmit` ต้องผ่านก่อน commit เสมอ** — นี่คือด่านหลัก
2. **Playwright smoke test 3 เคส** — login / เพิ่ม lead / บันทึกผลโทร
   ถ้าสามอันนี้ผ่าน แปลว่าระบบยังใช้งานได้
3. **ทดสอบ RLS ด้วยมือก่อนขึ้นจริง** — สร้างผู้ใช้ทดสอบ role `staff`
   แล้วยืนยันว่าเห็น lead ของคนอื่นไม่ได้จริง

ข้อ 3 สำคัญที่สุดและเป็นข้อที่ vibe code พลาดบ่อยที่สุด เพราะ AI มักเขียน policy
ที่ดูถูกแต่เปิดกว้างเกินจริง — ต้องลองด้วยตาตัวเอง

---

## 9. สำรองข้อมูล — อย่าข้าม

ระบบนี้เก็บข้อมูลที่หายแล้วสร้างใหม่ไม่ได้ และมีคนดูแลคนเดียว

1. **Supabase backup** — แพ็กเกจ Pro มีสำรองรายวัน ถ้าอยู่ free tier ไม่มี
2. **ส่งออก CSV รายสัปดาห์** ด้วย GitHub Action ไปเก็บใน Google Drive ของทีม
3. **ปุ่ม "ส่งออก Excel" ในหน้าเว็บ** ให้ทีมกดเองได้เสมอ

ข้อ 3 ไม่ใช่แค่ฟีเจอร์ แต่เป็นประกันว่า **ถ้าระบบล่มหรือคนดูแลหายไป ทีมยังทำงานต่อได้**
ซึ่งเป็นความเสี่ยงจริงของโปรเจกต์ที่คนเดียวสร้าง

---

## 10. ค่าใช้จ่ายจริง

| | ฟรี | เมื่อโตขึ้น |
|---|---|---|
| Supabase | Free (~500MB DB / 1GB ไฟล์) | Pro ~$25/เดือน |
| Vercel | Hobby — **ใช้เชิงพาณิชย์ไม่ได้ตามเงื่อนไข** | Pro ~$20/เดือน |
| Sentry | Free เพียงพอ | — |
| LINE OA | ตามแพ็กเกจที่ใช้อยู่ | — |

**ประมาณการ ~$45/เดือน (~1,600 บาท)** เมื่อใช้งานจริงเต็มรูปแบบ

จุดที่จะชนเพดานก่อนคือ **storage ของเอกสาร** ไม่ใช่จำนวนแถว
ถ้าโตเกินแพ็กเกจ ทางออกที่ถูกที่สุดคือย้ายไฟล์ไป Cloudflare R2 (ไม่คิดค่า egress)
แล้วเก็บแค่ path ไว้ใน Postgres — ออกแบบตาราง `documents` ให้เก็บ path
ไม่ใช่ URL เต็ม จะย้ายทีหลังได้โดยไม่ต้องแก้โค้ดเยอะ

---

## 11. สิ่งที่จงใจไม่ใช้

| | ทำไม |
|---|---|
| Prisma / Drizzle | ข้าม RLS ทำให้ชั้นสิทธิ์ย้ายกลับไปอยู่ในโค้ดแอป |
| tRPC / GraphQL | Server Action พอแล้วสำหรับ CRUD ขนาดนี้ |
| Redux / Zustand | Server Component ถือ state ส่วนใหญ่อยู่แล้ว |
| Docker / Kubernetes | ไม่มีใครดูแล และไม่ได้แก้ปัญหาอะไรที่มีอยู่ |
| Micro-frontend / monorepo | แอปเดียว ทีมเดียว |
| ระบบ i18n | ภาษาไทยอย่างเดียว ใส่ i18n คือเพิ่มงานเปล่า ๆ |
| Algolia / Typesense | pg_trgm พอที่ขนาดนี้ ค่อยคิดตอนเกิน 50,000 แถว |
