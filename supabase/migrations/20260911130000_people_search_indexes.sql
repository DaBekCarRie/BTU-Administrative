-- ค้นหาภาษาไทยด้วย trigram
-- Postgres ตัดคำไทยไม่ได้ (ภาษาไทยไม่เว้นวรรคระหว่างคำ) ถ้าใช้ to_tsvector
-- ค้น "ศิริ" จะไม่เจอ "ศิริพร" — trigram แก้ปัญหานี้และรองรับชื่อปนไทย-อังกฤษด้วย index ชุดเดียว
create index people_full_name_trgm
  on public.people using gin (full_name extensions.gin_trgm_ops);

create index people_facebook_name_trgm
  on public.people using gin (facebook_name extensions.gin_trgm_ops);
