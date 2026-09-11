/**
 * อ่านค่า env แบบล้มเร็ว — ถ้าลืมตั้งค่าจะพังตอน build ไม่ใช่ตอนผู้ใช้กดปุ่ม
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`ไม่พบตัวแปรสภาพแวดล้อม ${name} — ดู .env.example`);
  return value;
}

export const env = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;

/** ใช้ได้เฉพาะฝั่ง server เท่านั้น — ห้ามเรียกจาก client component */
export function serverEnv() {
  return {
    serviceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    lineGroupId: process.env.LINE_GROUP_ID ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}
