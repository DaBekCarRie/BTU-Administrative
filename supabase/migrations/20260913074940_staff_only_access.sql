-- เฉพาะเจ้าหน้าที่ที่ยังใช้งานอยู่จึงอ่านและเขียนข้อมูลได้ (ADR-0005)
--
-- เดิมทุก policy เป็น "ผู้ที่ล็อกอินแล้ว" ซึ่งถูกต้องตอนที่บัญชีทุกบัญชีถูกสร้างด้วยมือ
-- พอเปิดลงชื่อเข้าใช้ด้วย Google ใครสมัครก็ "ล็อกอินแล้ว" ทันที และอ่านข้อมูลคนได้ครบ
-- ด่านในแอป (callback + layout) กันได้แค่หน้าจอ ถือ token ยิง API ตรงก็ข้ามได้หมด
--
-- ไม่ขัด ADR-0004: เจ้าหน้าที่ทุกคนยังเห็นทุกอย่างเหมือนเดิม กั้นเฉพาะคนนอกทีม
-- ห่อด้วย (select …) ให้ Postgres คำนวณครั้งเดียวต่อ query ไม่ใช่ทุกแถว

alter policy answers_rw on public.answers
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy applications_rw on public.applications
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy documents_rw on public.documents
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy exam_center_requests_rw on public.exam_center_requests
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy merged_people_rw on public.merged_people
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy payments_rw on public.payments
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

-- ชื่อเดิมบอกว่า "authenticated" ซึ่งจะผิดหลังจากนี้ จึงสร้างใหม่แทนการ alter
drop policy people_all_authenticated on public.people;
create policy people_staff_all on public.people
  for all to authenticated
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

alter policy events_select on public.events
  using ((select private.current_staff_id()) is not null);
alter policy events_insert on public.events
  with check ((select private.current_staff_id()) is not null);

alter policy faculties_select on public.faculties
  using ((select private.current_staff_id()) is not null);
alter policy programs_select on public.programs
  using ((select private.current_staff_id()) is not null);

drop policy staff_select_authenticated on public.staff;
create policy staff_select on public.staff
  for select to authenticated
  using ((select private.current_staff_id()) is not null);

alter policy document_access_log_insert on public.document_access_log
  with check ((select private.current_staff_id()) is not null);

alter policy documents_bucket_rw on storage.objects
  using (bucket_id = 'documents' and (select private.current_staff_id()) is not null)
  with check (bucket_id = 'documents' and (select private.current_staff_id()) is not null);
