-- id เคยรับค่ามาจาก auth.users จึงไม่มี default
-- ตอนนี้เจ้าหน้าที่สร้างได้เองโดยยังไม่มีบัญชี ต้องออก id เอง
alter table public.staff alter column id set default gen_random_uuid();
