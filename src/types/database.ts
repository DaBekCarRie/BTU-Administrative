/**
 * ไฟล์นี้ generate อัตโนมัติ — ห้ามแก้ด้วยมือ
 *
 *   npm run db:types
 *
 * ตอนนี้ยังไม่มีตารางในฐานข้อมูล จึงเป็นโครงเปล่า
 * เมื่อสร้าง migration แรกแล้วให้รันคำสั่งข้างบนทับไฟล์นี้
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
