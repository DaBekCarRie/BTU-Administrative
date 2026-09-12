/**
 * ป้องกัน open redirect โดยอนุญาตเฉพาะ path ภายในระบบที่ขึ้นต้นด้วย / ตัวเดียว
 * ปฏิเสธ //attacker.com, /\evil.com และ URL ภายนอกทั้งหมด
 */
export function safeRedirectPath(
  next?: string | null,
  fallback = "/queue",
): string {
  if (!next || typeof next !== "string") {
    return fallback;
  }

  const trimmed = next.trim();

  // ต้องขึ้นต้นด้วย / แต่ต้องไม่ขึ้นต้นด้วย // หรือ /\
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  return trimmed;
}
