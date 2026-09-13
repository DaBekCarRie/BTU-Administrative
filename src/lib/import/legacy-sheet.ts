/**
 * รูปร่างของชีทติดตามเดิม — ใช้ร่วมกันระหว่างสคริปต์นำเข้ากับสคริปต์สร้างไฟล์สมมติ
 * ถ้าชีทเปลี่ยนคอลัมน์ ต้องแก้ที่นี่ที่เดียว
 */
export const HEADER_ROWS = 2;

export const LEGACY_COL = {
  contactedAt: 1,
  name: 2,
  line: 3,
  facebook: 4,
  normal: 5,
  supplementary: 6,
  distance: 7,
  faculty: 9,
  program: 10,
  priorEducation: 11,
  phone: 14,
  callDate: 15,
  callTime: 16,
  note: 17,
  owner: 18,
  /** ติดตามครั้งที่ 1–6 — สคริปต์นำเข้าอ่านเฉพาะช่วงนี้ */
  followUps: [19, 20, 21, 22, 23, 24],
  /** ช่องติดตามเกินหกครั้งที่บางแถวเขียนต่อท้ายไว้ นำเข้าไม่อ่าน แต่มีข้อมูลส่วนบุคคลได้ */
  extraFollowUps: [25, 26, 27, 28],
} as const;
