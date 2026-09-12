/** อ่านช่องข้อความจากฟอร์ม ตัดช่องว่างหัวท้าย ว่างเปล่าคืน null */
export function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}
