-- ===== เลขบัตรประชาชน (ใบ 09) =====
--
-- ตั้งใจไม่ให้เลขบัตรผ่านระบบเหตุการณ์ ทั้งที่ ADR-0001 บอกว่า people มาจาก events
-- เพราะ events.payload เป็น jsonb ที่ไม่ได้เข้ารหัส ถ้าส่งเลขบัตรผ่านทางนั้น
-- เลขตัวจริงจะนอนอยู่ในตาราง events ตลอดไปแบบ plaintext ซึ่งทำลายจุดประสงค์ของการเข้ารหัส
--
-- คีย์ต้องมีอยู่ใน Vault ก่อน สร้างครั้งเดียวด้วย:
--   select vault.create_secret(
--     encode(extensions.gen_random_bytes(32), 'base64'),
--     'national_id_key',
--     'คีย์สำหรับเข้ารหัสเลขบัตรประชาชนในตาราง people');

create or replace function private.national_id_key()
returns text
language sql
stable
security definer
set search_path = vault, pg_temp
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'national_id_key'
$$;

revoke all on function private.national_id_key() from public, anon, authenticated;

create or replace function public.set_national_id(
  p_person_id uuid,
  p_national_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  digits text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  if digits = '' then
    perform set_config('app.people_write', 'on', true);
    update public.people
    set national_id_enc = null, national_id_last4 = null
    where id = p_person_id;
    return;
  end if;

  if length(digits) <> 13 then
    raise exception 'เลขบัตรประชาชนต้องมี 13 หลัก';
  end if;

  perform set_config('app.people_write', 'on', true);
  update public.people
  set national_id_enc   = extensions.pgp_sym_encrypt(digits, private.national_id_key()),
      national_id_last4 = right(digits, 4)
  where id = p_person_id;

  insert into public.document_access_log (person_id, what, viewed_by)
  values (p_person_id, 'บันทึกเลขบัตรประชาชน', auth.uid());
end;
$$;

create or replace function public.read_national_id(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result text;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  select extensions.pgp_sym_decrypt(national_id_enc, private.national_id_key())
  into result
  from public.people
  where id = p_person_id and national_id_enc is not null;

  insert into public.document_access_log (person_id, what, viewed_by)
  values (p_person_id, 'เปิดดูเลขบัตรประชาชน', auth.uid());

  return result;
end;
$$;

revoke all on function public.set_national_id(uuid, text)  from public, anon;
revoke all on function public.read_national_id(uuid)       from public, anon;
grant execute on function public.set_national_id(uuid, text) to authenticated;
grant execute on function public.read_national_id(uuid)      to authenticated;

-- ===== ที่เก็บเอกสาร (ใบ 08) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- bucket เป็น private: เข้าถึงได้เฉพาะผ่าน signed URL ที่สร้างจากฝั่งเซิร์ฟเวอร์
create policy documents_bucket_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');
