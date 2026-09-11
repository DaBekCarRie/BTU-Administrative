/**
 * กฎล้างข้อมูลจากชีทเดิม — ฟังก์ชันบริสุทธิ์ทั้งหมด ทดสอบได้โดยไม่ต้องมีไฟล์หรือฐานข้อมูล
 *
 * ปัญหาที่ต้องแก้ (วัดจากไฟล์จริง 3,180 แถว):
 *   คณะ 64 ค่า → 10 · สาขา 90 → ~25 · วุฒิ 43 → 5 · ชื่อเจ้าหน้าที่ 16 → 5
 *   ช่อง "วันที่ให้โทร" 1,486 จาก 1,530 แถวไม่ใช่วันที่ แต่เป็นสถานะ
 */

/**
 * ลบวรรณยุกต์และสระที่พิมพ์ซ้ำติดกัน
 * ต้นเหตุของ ฝ้าย / ฝ้้าย / ฝ้้้าย / ฝ้้้้าย ที่มองด้วยตาไม่เห็นความต่าง
 */
export function collapseThaiDuplicates(input: string): string {
  // U+0E31, U+0E34-U+0E3A, U+0E47-U+0E4E คือสระบนล่างและวรรณยุกต์
  return input.replace(
    /([ัิ-ฺ็-๎])\1+/g,
    "$1",
  );
}

export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return collapseThaiDuplicates(input.replace(/\s+/g, " ").trim());
}

const FACULTY_ALIASES: Record<string, string> = {
  บริหารธุกิจ: "บริหารธุรกิจ",
  บริหาร: "บริหารธุรกิจ",
  บริหารธุรกิจบัณฑิต: "บริหารธุรกิจ",
  รัฐศาสต: "รัฐศาสตร์",
  รัฐศาตร์: "รัฐศาสตร์",
  ศึกษาศาตร์: "ศึกษาศาสตร์",
  บัญชีบัณฑิต: "บัญชี",
  การบัญชี: "บัญชี",
  // ในชีทเดิมถูกบันทึกเป็น "คณะ" แต่จริง ๆ เป็นหลักสูตรปริญญาโทใต้ศึกษาศาสตร์
  บริหารการศึกษา: "ศึกษาศาสตร์",
  // สะกดผิดที่พบจริงในไฟล์
  บริหาธุรกิจ: "บริหารธุรกิจ",
  บริหารธุระกิจ: "บริหารธุรกิจ",
  บริหารธุรกิ: "บริหารธุรกิจ",
  วิศวกรรรมศาสตร์: "วิศวกรรมศาสตร์",
  วิศวกรรมศาตร์: "วิศวกรรมศาสตร์",
  พยาบาล: "พยาบาลศาสตร์",
  สาธารณสุข: "สาธารณสุขศาสตร์",
  ปฐมวัย: "ศึกษาศาสตร์",
  ศิลปกรรม: "ศิลปกรรมศาสตร์",
  วิทยาศาสตร์: "วิทยาศาสตร์และเทคโนโลยี",
  เทคโนโลยีสารสนเทศ: "วิทยาศาสตร์และเทคโนโลยี",
};

export const KNOWN_FACULTIES = [
  "บริหารธุรกิจ",
  "รัฐศาสตร์",
  "บัญชี",
  "วิศวกรรมศาสตร์",
  "ศึกษาศาสตร์",
  "นิติศาสตร์",
  "ศิลปศาสตร์",
  "สาธารณสุขศาสตร์",
  "พยาบาลศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "ศิลปกรรมศาสตร์",
] as const;

export function normalizeFaculty(input: string | null): string | null {
  const cleaned = cleanText(input).replace(/^คณะ\s*/, "");
  if (!cleaned) return null;
  if ((KNOWN_FACULTIES as readonly string[]).includes(cleaned)) return cleaned;
  return FACULTY_ALIASES[cleaned] ?? null;
}

/** ชื่อสาขาทางการ ตรงกับที่ seed ไว้ในฐานข้อมูล */
export const KNOWN_PROGRAMS = [
  "การจัดการ",
  "การจัดการโลจิสติกส์",
  "การตลาด",
  "รัฐประศาสนศาสตร์",
  "การบัญชี",
  "วิศวกรรมโยธา",
  "การศึกษาปฐมวัย",
  "บริหารการศึกษา",
  "นิติศาสตร์",
  "ภาษาอังกฤษ",
  "นวัตกรรมบริการเพื่อการท่องเที่ยวและการโรงแรม",
  "สาธารณสุขศาสตร์",
  "พยาบาลศาสตร์",
  "เทคโนโลยีสารสนเทศ",
  "เทคโนโลยีมัลติมีเดียและแอนิเมชัน",
  "เทคโนโลยีการจัดการอุตสาหกรรมและพลังงาน",
  "การออกแบบทัศนศิลป์และการออกแบบผลิตภัณฑ์",
] as const;

const PROGRAM_ALIASES: Record<string, string> = {
  โลจิสติก: "การจัดการโลจิสติกส์",
  โลจิสติกส์: "การจัดการโลจิสติกส์",
  "การจัดการ/โลจิสติกส์": "การจัดการโลจิสติกส์",
  การจัดการโลจิสติก: "การจัดการโลจิสติกส์",
  รปศ: "รัฐประศาสนศาสตร์",
  "รปศ.": "รัฐประศาสนศาสตร์",
  รัฐประศาสนศาสตร: "รัฐประศาสนศาสตร์",
  บัญชี: "การบัญชี",
  เอกปฐมวัย: "การศึกษาปฐมวัย",
  วิชาการศึกษาปฐมวัย: "การศึกษาปฐมวัย",
  ปฐมวัย: "การศึกษาปฐมวัย",
  โยธา: "วิศวกรรมโยธา",
  บริหารการศึกษา: "บริหารการศึกษา",
  บริหารธุรกิจ: "การจัดการ",
  นิติศาสตร์: "นิติศาสตร์",
  ภาษาอังกฤษ: "ภาษาอังกฤษ",
  การตลาด: "การตลาด",
  การจัดการ: "การจัดการ",
  พยาบาลศาสตร์: "พยาบาลศาสตร์",
  สาธารณสุขศาสตร์: "สาธารณสุขศาสตร์",
  // สะกดผิดที่พบจริงในไฟล์
  โลจิสจิกส์: "การจัดการโลจิสติกส์",
  โลจิสติกส: "การจัดการโลจิสติกส์",
  การจัดกา: "การจัดการ",
  การจัดการทั่วไป: "การจัดการ",
  วิศวโยธา: "วิศวกรรมโยธา",
  วิศวกรรมโยธา: "วิศวกรรมโยธา",
  การศึกษาปฐมวัย: "การศึกษาปฐมวัย",
  บัญชีบัณฑิต: "การบัญชี",
};

export function normalizeProgram(input: string | null): string | null {
  const cleaned = cleanText(input).replace(/^สาขา(วิชา)?\s*/, "");
  if (!cleaned) return null;
  // ชื่อที่ถูกต้องอยู่แล้วต้องผ่านโดยไม่ต้องมีใน alias
  if ((KNOWN_PROGRAMS as readonly string[]).includes(cleaned)) return cleaned;
  return PROGRAM_ALIASES[cleaned] ?? null;
}

export type PriorEducation =
  | "ม.6"
  | "กศน.เทียบเท่า ม.6"
  | "ปวช."
  | "ปวส."
  | "ปริญญาตรี"
  | "อื่นๆ";

export function normalizePriorEducation(
  input: string | null,
): PriorEducation | null {
  const cleaned = cleanText(input).replace(/\s/g, "");
  if (!cleaned) return null;

  // กศน. เขียนได้ 7 แบบในข้อมูลจริง จับด้วยคำว่า กศน เป็นหลัก
  if (cleaned.includes("กศน")) return "กศน.เทียบเท่า ม.6";
  if (/^ม\.?6/.test(cleaned) || cleaned.includes("มัธยม")) return "ม.6";
  if (cleaned.startsWith("ปวส")) return "ปวส.";
  if (cleaned.startsWith("ปวช")) return "ปวช.";
  if (cleaned.includes("ตรี")) return "ปริญญาตรี";
  return "อื่นๆ";
}

export type StudyMode = "ปกติ" | "สมทบ" | "ทางไกล";

/** ชีทเดิมใช้สามคอลัมน์ติ๊ก ไม่ใช่ช่องเดียว */
export function normalizeStudyMode(
  normal: string | null,
  supplementary: string | null,
  distance: string | null,
): StudyMode | null {
  if (cleanText(distance)) return "ทางไกล";
  if (cleanText(supplementary)) return "สมทบ";
  if (cleanText(normal)) return "ปกติ";
  return null;
}

export type FollowUpStatus =
  | "ใหม่"
  | "กำลังติดตาม"
  | "นัดโทรแล้ว"
  | "สนใจสมัคร"
  | "สมัครแล้ว"
  | "ไม่สนใจ"
  | "ติดต่อไม่ได้";

export type CallDateField =
  | { kind: "date"; value: string }
  | { kind: "status"; value: FollowUpStatus }
  | { kind: "unknown"; raw: string }
  | { kind: "empty" };

const STATUS_WORDS: { match: RegExp; status: FollowUpStatus }[] = [
  { match: /สมัครแล้ว/, status: "สมัครแล้ว" },
  { match: /ไม่สมัคร|ไม่สนใจ/, status: "ไม่สนใจ" },
  { match: /ไม่ต้องโทร|ติดต่อไม่ได้|ไม่รับสาย/, status: "ติดต่อไม่ได้" },
];

/**
 * ช่อง "วัน/เดือน/ปีที่ให้โทร" ในชีทเดิมมีทั้งวันที่และสถานะปนกัน
 * 1,486 จาก 1,530 แถวไม่ใช่วันที่
 */
export function parseCallDateField(input: string | null): CallDateField {
  const raw = cleanText(input);
  if (!raw) return { kind: "empty" };

  for (const { match, status } of STATUS_WORDS) {
    if (match.test(raw)) return { kind: "status", value: status };
  }

  const date = parseThaiDate(raw);
  if (date) return { kind: "date", value: date };

  return { kind: "unknown", raw };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * วันที่ในชีทเดิมมีหลายรูปแบบ: 17/04/2025 · 13-May-2026 · 2024-11-01
 * ปีอาจเป็น ค.ศ. หรือ พ.ศ. — เกิน 2400 ถือว่าเป็น พ.ศ.
 */
export function parseThaiDate(input: string | null): string | null {
  const raw = cleanText(input);
  if (!raw) return null;

  const toIso = (y: number, m: number, d: number): string | null => {
    const year = y > 2400 ? y - 543 : y;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(year, m - 1, d, 5, 0, 0));
    if (Number.isNaN(date.getTime())) return null;
    if (year < 2000) return null;

    // วันที่ในอนาคตไกล ๆ มาจากปี พ.ศ. ที่พิมพ์ผิดในชีท เช่น 2601 กลายเป็น ค.ศ. 2058
    // ต้องปฏิเสธและให้ไปอยู่ในรายงาน ไม่ใช่รับเข้ามาแล้วทำให้การเรียงลำดับพัง
    const oneYearAhead = Date.now() + 400 * 86_400_000;
    if (date.getTime() > oneYearAhead) return null;

    return date.toISOString();
  };

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return toIso(+match[1], +match[2], +match[3]);

  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return toIso(+match[3], +match[2], +match[1]);

  match = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    if (month) return toIso(+match[3], month, +match[1]);
  }

  return null;
}

export type CallOutcome =
  | "ไม่รับสาย"
  | "คุยแล้วสนใจ"
  | "คุยแล้วไม่สนใจ"
  | "ขอคิดดูก่อน"
  | "นัดโทรใหม่"
  | "สมัครแล้ว";

/**
 * ช่องติดตามในชีทเดิมเป็นข้อความก้อนเดียว เช่น
 * "ฝ้ายโทร 25/03/2025 สนใจสมัคร" — ต้องแยกวันที่ ผลลัพธ์ และบันทึกย่อออกจากกัน
 */
export function parseFollowUp(
  input: string | null,
): { occurredAt: string | null; outcome: CallOutcome; note: string } | null {
  const raw = cleanText(input);
  if (!raw) return null;

  const dateMatch = raw.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
  const occurredAt = dateMatch ? parseThaiDate(dateMatch[1]) : null;

  let outcome: CallOutcome = "ขอคิดดูก่อน";
  if (/ไม่รับสาย|ไม่ได้รับสาย|ปิดเครื่อง/.test(raw)) outcome = "ไม่รับสาย";
  else if (/สมัครแล้ว|สมัครเรียบร้อย/.test(raw)) outcome = "สมัครแล้ว";
  else if (/สนใจสมัคร|สนใจเรียน/.test(raw)) outcome = "คุยแล้วสนใจ";
  else if (/ไม่สนใจ|ไม่สมัคร|ได้ที่เรียน/.test(raw)) outcome = "คุยแล้วไม่สนใจ";
  else if (/นัด|โทรใหม่|ติดต่อใหม่/.test(raw)) outcome = "นัดโทรใหม่";

  return { occurredAt, outcome, note: raw };
}
