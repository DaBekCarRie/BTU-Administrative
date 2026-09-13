-- ลบเอกสารอ้างอิงได้เฉพาะหัวหน้าทีม (ใบ 07)
--
-- ของกลางที่ทุกคนใช้ ถ้าคนเดียวเผลอลบกระทบทั้งทีม และย้อนกลับไม่ได้
-- เจ้าหน้าที่ทุกคนยังเพิ่มและแก้ได้เหมือนเดิม (ADR-0004 · ADR-0006)
--
-- ต้องมีครบสามที่: ตารางรายการ · ตารางไฟล์ · ตัวไฟล์ใน bucket
-- ไม่งั้นลบรายการได้แต่ไฟล์ค้างใน storage เป็นไฟล์กำพร้า
create policy reference_documents_delete on public.reference_documents
  for delete to authenticated
  using ((select private.current_staff_role()) = 'admin');

create policy reference_document_files_delete on public.reference_document_files
  for delete to authenticated
  using ((select private.current_staff_role()) = 'admin');

create policy reference_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'reference' and (select private.current_staff_role()) = 'admin');
