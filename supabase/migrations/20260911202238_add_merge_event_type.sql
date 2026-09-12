-- เพิ่มชนิดเหตุการณ์สำหรับการรวมสองรายการที่เป็นคนเดียวกัน (ใบ 07)
-- ต้องแยก migration เพราะ alter type ... add value ใช้ร่วมทรานแซกชันกับ DDL อื่นไม่ได้
alter type public.event_type add value if not exists 'รวมข้อมูล';
