-- ตาม Supabase performance advisor หลัง /code-review
--
-- 1) index ให้ FK ที่แอปใช้กรองหรือ join จริง (ไม่ใส่ให้ทุก FK — คอลัมน์ที่ไม่เคยถูกกรองใส่ไปก็เปลืองตอนเขียน)
--    people.faculty_id / program_id  ← /leads กรองตามคณะ
--    document_access_log.person_id   ← หน้าร่องรอยการเข้าถึง และ merge_people ย้ายแถว
--    exam_center_requests.person_id  ← listRequestsForPerson
--    merged_people.survivor_id       ← หา "รายการนี้เคยรวมใครเข้ามาบ้าง"
create index if not exists people_faculty_idx            on public.people (faculty_id);
create index if not exists people_program_idx            on public.people (program_id);
create index if not exists document_access_log_person_idx on public.document_access_log (person_id);
create index if not exists exam_center_requests_person_idx on public.exam_center_requests (person_id);
create index if not exists merged_people_survivor_idx    on public.merged_people (survivor_id);

-- 2) auth.uid() ใน policy ถูกประเมินใหม่ทุกแถว — ห่อด้วย (select ...) ให้ประเมินครั้งเดียว
--    แก้ตัวเดียวที่มี และเป็นแบบอย่างให้ policy ที่เขียนใหม่ในอนาคต
drop policy if exists staff_update_self on public.staff;
create policy staff_update_self on public.staff
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()) and role = private.current_staff_role());
