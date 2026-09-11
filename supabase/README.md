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
