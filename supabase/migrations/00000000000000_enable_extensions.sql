-- ส่วนขยายที่ระบบนี้ต้องใช้ (ดู docs/STACK.md)
--   pgcrypto : เข้ารหัสเลขบัตรประชาชน
--   pg_trgm  : ค้นหาภาษาไทย (Postgres ตัดคำไทยไม่ได้ ต้องใช้ trigram)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
