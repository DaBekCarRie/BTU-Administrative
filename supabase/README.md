# Supabase

Project: `btu-admin` (`encpmkhwxctcvcytfmuo`) · region `ap-southeast-1` (สิงคโปร์)

## กฎ

1. **แก้ schema ผ่านไฟล์ migration เท่านั้น** ห้ามแก้ผ่านหน้า Dashboard
   เพราะ AI อ่านไฟล์ในโปรเจกต์ ไม่เห็นหน้าเว็บ — ถ้าแก้ใน Dashboard
   โค้ดกับฐานข้อมูลจะไม่ตรงกันเงียบ ๆ
2. **หลังแก้ schema ทุกครั้ง ต้อง generate type ใหม่ทันที**

```bash
npx supabase migration new ชื่อ_migration
npx supabase db push
npm run db:types
```

## เชื่อมกับ project (ทำครั้งเดียว)

```bash
npx supabase login
npx supabase link --project-ref encpmkhwxctcvcytfmuo
```

## คำเตือนจาก Supabase advisor ที่ "ตั้งใจให้เป็นแบบนั้น"

advisor จะเตือนว่า `read_national_id` · `set_national_id` · `merge_people`
เป็น `SECURITY DEFINER` ที่ `authenticated` เรียกได้

**ทั้งสามตัวตั้งใจให้เรียกได้** เพราะเป็นประตูเดียวที่ควบคุมไว้ ด่านตรวจอยู่ในตัวฟังก์ชันเอง
(ต้องล็อกอิน · เขียน log ทุกครั้ง · merge ต้องเป็น admin) เหตุผลเต็มเขียนไว้ใน
`comment on function` ของแต่ละตัว — อ่านก่อนคิดจะ revoke หรือเปลี่ยนเป็น security invoker

เหลืออีกข้อที่ยังต้องทำด้วยมือ: เปิด **Leaked Password Protection**
ที่ Dashboard → Authentication → Policies (แก้ในโค้ดไม่ได้)
