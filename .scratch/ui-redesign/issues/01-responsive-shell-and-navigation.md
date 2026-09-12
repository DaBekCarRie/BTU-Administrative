# 01: โครงแอปที่รองรับมือถือและแถบนำทางย่อขยายได้ (Responsive App Shell & Navigation)

**What to build:** ปรับปรุง Layout หลักของระบบให้รองรับทั้งหน้าจอเดสก์ท็อปและสมาร์ทโฟนตามต้นแบบ Claude Design
โดยเพิ่ม Mobile Header, Slide-out Drawer, Mobile Bottom Navigation Bar (4 ปุ่ม: คิวโทร, ผู้สนใจ, เอกสาร, เพิ่มเติม)
พร้อมตัวเลขแจ้งเตือนงานค้างสีแดง และเพิ่มฟังก์ชันย่อ/ขยายแถบเมนูข้าง (Collapsible Sidebar 240px <-> 56px) บนเดสก์ท็อป

**Blocked by:** None (can start immediately)

**Status:** done

- [x] เพิ่มคอมโพเนนต์ Mobile Header ด้านบน (แสดงปุ่ม Hamburger, ชื่อหน้า, วันที่/คำอธิบายย่อย, วงกลมอักษรย่อผู้ใช้) แสดงเฉพาะหน้าจอมือถือ (`md:hidden`)
- [x] เพิ่มคอมโพเนนต์ Mobile Bottom Navigation Bar ตรึงด้านล่าง 4 ปุ่ม (คิวโทร, ผู้สนใจ, เอกสาร, เพิ่มเติม) พร้อม Badge ตัวเลขสีแดงเมื่อมีงานค้าง
- [x] เพิ่ม Mobile Slide-out Drawer เมื่อแตะปุ่ม Hamburger หรือปุ่ม "เพิ่มเติม" แสดงเมนูหลักครบทุกหน้า พร้อมข้อมูลผู้ใช้และปุ่มออกจากระบบ
- [x] เพิ่มปุ่ม Toggle ย่อ/ขยาย Sidebar บนเดสก์ท็อป (240px เป็น 56px โหมดไอคอนอย่างเดียว) พร้อมสถานะ `aria-expanded`
- [x] ปรับปรุงการแสดงผลเมนูที่กำลังเปิดอยู่ด้วยสีน้ำเงินเข้ม `#0F2A4A` และฟอนต์ IBM Plex Sans Thai
- [x] สร้างชุดทดสอบ Playwright E2E สำหรับ Responsive Shell ทั้งใน viewport เดสก์ท็อปและมือถือ (`e2e/responsive-shell.spec.ts`)
- [x] `npm run typecheck`, `npm run lint`, และ `npm run build` ผ่าน

## ผลการตรวจและทดสอบ

1. **Playwright E2E Tests**:
   - `e2e/responsive-shell.spec.ts` ผ่านครบ 100% ทั้งบน Desktop Viewport (1280x800) และ Mobile Viewport (390x844)
   - ชุดทดสอบเดิม `e2e/login.spec.ts`, `e2e/queue.spec.ts`, `e2e/leads.spec.ts`, `e2e/documents.spec.ts` (18 ข้อ) ผ่านครบถ้วน ไม่พบผลกระทบข้างเคียง
2. **Quality Gates**:
   - `npm run typecheck`: 0 error
   - `npm test`: 115 unit tests ผ่าน
   - `npm run lint`: ผ่าน 0 warning/error
   - `npm run build`: compile & generate static/dynamic routes ผ่าน 17/17 routes
