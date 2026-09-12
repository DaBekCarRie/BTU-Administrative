-- Supabase advisor เตือนว่าฟังก์ชัน security definer สามตัวนี้เรียกได้จาก authenticated
-- ทั้งสามตัวตั้งใจให้เรียกได้ เพราะเป็น "ประตูเดียว" ที่ควบคุมไว้ ไม่ใช่ช่องโหว่
-- เขียนเหตุผลติดไว้ที่ฟังก์ชัน เพื่อไม่ให้ใครมา "แก้" ตามคำเตือนแล้วพังทั้งระบบ

comment on function public.read_national_id(uuid) is
$$ตั้งใจให้ authenticated เรียกได้ — เป็นทางเดียวที่อ่านเลขบัตรประชาชนได้
security definer จำเป็นเพราะคีย์อยู่ใน Vault ที่ authenticated เข้าไม่ถึงโดยตรง
ด่านตรวจอยู่ในตัวฟังก์ชัน: ต้องล็อกอิน และเขียน document_access_log ทุกครั้งโดยเลี่ยงไม่ได้
ถ้าเปลี่ยนเป็น security invoker หรือ revoke execute ระบบจะอ่านเลขบัตรไม่ได้เลย$$;

comment on function public.set_national_id(uuid, text) is
$$ตั้งใจให้ authenticated เรียกได้ — เป็นทางเดียวที่บันทึกเลขบัตรประชาชนแบบเข้ารหัสได้
security definer จำเป็นเพราะต้องใช้คีย์จาก Vault และต้องข้าม trigger กันเขียน people
ด่านตรวจอยู่ในตัวฟังก์ชัน: ต้องล็อกอิน ตรวจ 13 หลัก และเขียน log ทุกครั้ง$$;

comment on function public.merge_people(uuid, uuid, jsonb) is
$$ตั้งใจให้ authenticated เรียกได้ แต่ด่านตรวจอยู่ในตัวฟังก์ชัน: ต้องเป็น role admin เท่านั้น
security definer จำเป็นเพราะตาราง events ตั้งใจให้แก้ไม่ได้ (มีแค่ policy select/insert)
การย้ายเจ้าของเหตุการณ์ตอนรวมรายการซ้ำเป็นข้อยกเว้นเดียวที่อนุญาต และทำได้ทางนี้ทางเดียว$$;

comment on function public.record_event(uuid, public.event_type, timestamptz, jsonb, jsonb) is
$$ทางเดียวที่อนุญาตให้เขียนข้อมูลคน (ADR-0001)
เขียน events และอัปเดตสถานะปัจจุบันใน people ในทรานแซกชันเดียว
สถานะใหม่คำนวณมาจาก TypeScript แล้ว ฟังก์ชันนี้ทำหน้าที่เก็บอย่างเดียว ไม่มี business logic$$;
