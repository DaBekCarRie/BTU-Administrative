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
