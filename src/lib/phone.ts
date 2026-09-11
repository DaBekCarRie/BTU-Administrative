/**
 * ทำเบอร์โทรให้เป็นรูปแบบเดียวกันก่อนบันทึกเสมอ
 * ข้อมูลเดิมมีทั้ง 0812345678, 081-234-5678, +66812345678 ปนกัน
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length === 11) digits = `0${digits.slice(2)}`;

  return /^0\d{9}$/.test(digits) ? digits : null;
}

/** 081-234-5678 */
export function formatPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return input?.trim() || "—";
  return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
}
