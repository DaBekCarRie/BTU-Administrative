/**
 * ชื่อทดสอบที่ไม่ชนกัน
 *
 * ใช้ Date.now() อย่างเดียวไม่พอ เพราะ worker หลายตัวเริ่มพร้อมกันได้ในมิลลิวินาทีเดียวกัน
 * แล้วชื่อแบบ "สอบ <ts>" จะกลายเป็นสตริงย่อยของ "ถอนสอบ <ts>"
 * ทำให้ locator เจอสองรายการและ strict mode ฟ้อง
 */
export function uniqueName(prefix: string): string {
  const token = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${token}`;
}

/**
 * อัปโหลดเอกสารต้องย่อรูปในเบราว์เซอร์ ส่งขึ้น Storage แล้วรอหน้าโหลดข้อมูลใหม่
 * ตอนหลาย worker รันพร้อมกันเกิน 5 วินาทีของค่าตั้งต้นได้จริง — ใช้กับด่านที่รอการอัปโหลดเสร็จเท่านั้น
 */
export const UPLOAD_DONE = { timeout: 20_000 };
