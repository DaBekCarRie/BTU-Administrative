-- สคริปต์ใน scripts/ ที่ใช้ service role เรียก record_event() ไม่ได้ตั้งแต่ 20260911165105
-- เพราะ record_event อ่าน private.current_staff_id() แต่ service_role ไม่มีสิทธิ์ใน schema private
-- ให้เฉพาะสองฟังก์ชันที่คืน null เมื่อไม่มีผู้ใช้ — national_id_key ยังล็อกไว้เหมือนเดิม
grant usage on schema private to service_role;
grant execute on function private.current_staff_id() to service_role;
grant execute on function private.current_staff_role() to service_role;
