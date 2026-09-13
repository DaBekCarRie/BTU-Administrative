/**
 * สร้างไฟล์นำเข้าสมมติจากชีทเดิม — แทนข้อมูลส่วนบุคคลแต่คงความรุงรังไว้ครบ
 *
 *   npm run mock:leads -- --in "<ชีทจริง>.csv" --out data/leads-mock.csv
 *
 * ความรุงรังของข้อมูลจริงคือสิ่งที่กฎล้างข้อมูลถูกเขียนมาแก้ ถ้าไฟล์สมมติสะอาดเกินไป
 * บั๊กที่เคยแก้จะกลับมาโดยไม่มีเทสต์ไหนจับได้ สคริปต์นี้จึง:
 *
 * - แทนชื่อทีละคำ คำเดิมได้คำสมมติเดิมเสมอ → ชื่อซ้ำยังซ้ำเป็นกลุ่มเดิม
 * - ใส่วรรณยุกต์ซ้ำกลับเข้าไปตรงที่ของเดิมซ้ำ → กฎยุบวรรณยุกต์ยังถูกทดสอบ
 * - แทนเบอร์ด้วยเบอร์สมมติที่คงรูปแบบขีดและความยาว → เบอร์ซ้ำยังซ้ำ เบอร์ผิดรูปยังผิดรูป
 * - แทนชื่อเจ้าหน้าที่ทุกรูปแบบที่เขียนผิด → ตารางแปลงชื่อผู้ดูแลยังถูกใช้
 * - ช่องช่วงเวลาให้ติดต่อ: แทนเบอร์ที่พิมพ์ผิดช่องไว้ คงคำบอกช่วงเวลาเดิม
 * - หมายเหตุและช่องติดตาม: **สร้างใหม่ทั้งช่อง** เพราะเจ้าหน้าที่พิมพ์ชื่อญาติ ที่อยู่
 *   ไอดีไลน์ และลักษณะที่ระบุตัวคนได้ไว้ ซึ่ง regex ล้างไม่หมด ช่องติดตามคงไว้เฉพาะ
 *   ส่วนที่กฎนำเข้าอ่าน คือผู้โทร วันที่ เวลา และคำบอกผลการโทร
 * - ไม่แตะคอลัมน์อื่นเลย
 *
 * การแทนใช้ HMAC กับเกลือสุ่มที่ไม่ถูกบันทึก — ไฟล์สมมติจึงย้อนกลับไปหาชื่อจริงไม่ได้
 * แม้คนจะเดาชื่อแล้วลองคำนวณดู รันแต่ละครั้งได้ชื่อสมมติชุดใหม่
 *
 * ก่อนเขียนไฟล์ สคริปต์ตรวจตัวเองว่าความรุงรังครบและไม่มีข้อมูลจริงหลุด
 * ไม่ผ่านข้อใดข้อหนึ่งจะไม่เขียนไฟล์และออกด้วย exit code 1
 */
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { parseCsv, toCsv } from "../src/lib/import/csv";
import { HEADER_ROWS, LEGACY_COL } from "../src/lib/import/legacy-sheet";
import {
  cleanText,
  collapseThaiDuplicates,
  parseCallDateField,
  parseFollowUp,
} from "../src/lib/import/normalize";
import { normalizePhone } from "../src/lib/phone";

const args = process.argv.slice(2);
const argValue = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const inPath = argValue("--in");
const outPath = argValue("--out") ?? "data/leads-mock.csv";

if (!inPath) {
  console.error("ต้องระบุไฟล์ชีทจริง: --in <path>.csv");
  process.exit(1);
}

const COL = {
  ...LEGACY_COL,
  allFollowUps: [...LEGACY_COL.followUps, ...LEGACY_COL.extraFollowUps],
} as const;
const FREE_TEXT = [COL.callTime, COL.note, ...COL.allFollowUps];
const TOUCHED = new Set<number>([COL.name, COL.phone, COL.owner, ...FREE_TEXT]);

const source = parseCsv(readFileSync(inPath, "utf8"));

const salt = randomBytes(32);
const hmac = (kind: string, key: string, attempt: number) =>
  createHmac("sha256", salt).update(`${kind}\0${key}\0${attempt}`).digest();

// ─── วรรณยุกต์ซ้ำ ──────────────────────────────────────────────────────────

const MARK = /[ัิ-ฺ็-๎]/;
const MARK_RUN = /([ัิ-ฺ็-๎])\1+/g;

/** ใส่วรรณยุกต์ซ้ำจากคำเดิมกลับลงในคำสมมติ ให้ collapse แล้วได้คำสมมติเดิม */
function injectRepeats(original: string, mock: string): string {
  const runs = [...original.matchAll(MARK_RUN)].map((m) => ({
    mark: m[1],
    length: m[0].length,
  }));
  if (runs.length === 0) return mock;

  const chars = [...mock];
  const extended = new Set<number>();
  for (const run of runs) {
    let at = chars.findIndex((c, i) => c === run.mark && !extended.has(i));
    if (at < 0) at = chars.findIndex((c, i) => MARK.test(c) && !extended.has(i));
    if (at < 0) at = chars.findIndex((c) => MARK.test(c));
    if (at < 0) continue;
    extended.add(at);
    chars[at] = chars[at].repeat(run.length);
  }
  return chars.join("");
}

// ─── คำสมมติ ──────────────────────────────────────────────────────────────

/** ทุกพยางค์ไทยต้องมีสระบนล่างหรือวรรณยุกต์ ไม่งั้นใส่วรรณยุกต์ซ้ำกลับไม่ได้ */
const THAI_SYLLABLES = [
  "กิ่ง", "แก้ว", "ขวัญ", "คำ", "จิต", "ชื่น", "ณัฐ", "ทิพ", "ธิดา", "นิ่ม",
  "บุญ", "ปิ่น", "พิม", "ภู่", "มณี", "ยิ่ง", "รัก", "ลำดวน", "วัน", "ศิริ",
  "สุข", "หอม", "อุ่น", "ชัย", "ทอง", "เพ็ญ", "พร้อม", "ปั้น", "ดี", "มั่น",
  "สิน", "จันทร์", "รุ่ง", "เดือน", "ฟ้า", "น้ำ", "ต้น", "ใบ้", "ภูมิ", "วิไล",
  "กุล", "นุช", "ปรีดา", "สมใจ", "ฤดี", "ธัญ", "อัญ", "ญาณ", "ภัทร", "กัญ",
].filter((s) => MARK.test(s));

const LATIN_SYLLABLES = [
  "ka", "ri", "son", "mel", "ta", "no", "vin", "lu", "dar", "pe",
  "sa", "wan", "chai", "ya", "pon", "rat", "tip", "nu", "kit", "mon",
  "bo", "le", "na", "sir", "dee", "an", "tor", "ra", "pim", "jo",
  "fa", "gun", "hel", "ix", "zen", "qua", "ul", "ver", "wy", "om",
];

const THAI_RUN = /[ก-๛]+/g;
const LATIN_RUN = /[A-Za-z]+/g;
/** ชื่อ Facebook มีอักษรจีน ญี่ปุ่น ฯลฯ ด้วย — ตัวอักษรที่ไม่ใช่ไทยหรือละติน */
const OTHER_LETTER_RUN = /[^\P{L}ก-๛A-Za-z]+/gu;
/** มีตัวอักษรภาษาใดก็ได้ — \p{L} ครอบไทยและละตินอยู่แล้ว */
const HAS_LETTER = /\p{L}/u;
const EMOJI_RUN = /\p{Extended_Pictographic}[\p{Extended_Pictographic}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}]*/gu;
const EMOJI = ["🌸", "🌼", "🍊", "🍋", "🌙", "⭐", "🐱", "🐶", "🦋", "🍓", "🌈", "☕", "🎵", "🍉", "🌿", "🐼"];

/**
 * คำสมมติห้ามบังเอิญตรงกับคำใดในชื่อจริง — ไม่งั้นพยางค์สุ่มอาจต่อกันได้ชื่อของคนจริง
 * แล้วไปโผล่ในแถวของอีกคน (เคยได้ "lemon" ซึ่งเป็นชื่อ Facebook จริง)
 */
const realTokens = new Set(
  source
    .slice(HEADER_ROWS)
    .flatMap((row) => [
      ...((row[COL.name] ?? "").match(THAI_RUN) ?? []).map(collapseThaiDuplicates),
      ...((row[COL.name] ?? "").match(LATIN_RUN) ?? []).map((t) => t.toLowerCase()),
    ]),
);

const usedTokens = new Set<string>();
const tokenCache = new Map<string, string>();

function mockWord(kind: "thai" | "latin", key: string): string {
  const cacheKey = `${kind}:${key}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) return cached;

  const syllables = kind === "thai" ? THAI_SYLLABLES : LATIN_SYLLABLES;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const bytes = hmac(`word-${kind}`, key, attempt);
    const count = attempt < 20 ? 2 : 3;
    let word = "";
    for (let i = 0; i < count; i += 1) {
      word += syllables[bytes.readUInt16BE(i * 2) % syllables.length];
    }
    if (collapseThaiDuplicates(word) !== word) continue;
    if (usedTokens.has(word) || realTokens.has(word.toLowerCase())) continue;
    usedTokens.add(word);
    tokenCache.set(cacheKey, word);
    return word;
  }
  throw new Error(`สร้างคำสมมติไม่ซ้ำไม่ได้: ${kind}`);
}

function matchCase(original: string, mock: string): string {
  if (original === original.toUpperCase() && original !== original.toLowerCase()) {
    return mock.toUpperCase();
  }
  if (original[0] === original[0]?.toUpperCase() && original[0] !== original[0]?.toLowerCase()) {
    return mock[0].toUpperCase() + mock.slice(1);
  }
  return mock;
}

const usedEmoji = new Set<string>();
const emojiCache = new Map<string, string>();

function mockEmoji(run: string): string {
  const cached = emojiCache.get(run);
  if (cached) return cached;
  const count = [...run.matchAll(/\p{Extended_Pictographic}/gu)].length;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const bytes = hmac("emoji", run, attempt);
    // อีโมจิมีให้เลือกไม่กี่แบบ ชนกันบ่อยก็ยาวขึ้นทีละตัวจนไม่ซ้ำ
    const length = count + Math.floor(attempt / 20);
    const candidate = Array.from({ length }, (_, i) => EMOJI[bytes[i % bytes.length] % EMOJI.length]).join("");
    if (candidate === run || usedEmoji.has(candidate)) continue;
    usedEmoji.add(candidate);
    emojiCache.set(run, candidate);
    return candidate;
  }
  throw new Error("สร้างอีโมจิสมมติไม่ซ้ำไม่ได้");
}

/**
 * แทนทุกช่วงตัวอักษร คงเครื่องหมาย ตัวเลข และช่องว่างไว้ตามเดิม
 * คีย์ละตินแยกตัวพิมพ์ เพราะสคริปต์นำเข้านับชื่อซ้ำแบบแยกตัวพิมพ์ — ถ้ายุบรวม
 * ชื่อที่ต่างกันแค่ตัวพิมพ์จะกลายเป็นชื่อซ้ำที่ไม่มีอยู่จริง
 */
function mockLetters(text: string): string {
  return text
    .replace(THAI_RUN, (run) =>
      injectRepeats(run, mockWord("thai", collapseThaiDuplicates(run))),
    )
    .replace(LATIN_RUN, (run) => matchCase(run, mockWord("latin", run)))
    .replace(OTHER_LETTER_RUN, (run) => mockWord("latin", `other:${run}`))
    .replace(EMOJI_RUN, (run) => mockEmoji(run));
}

// ─── เบอร์โทร ─────────────────────────────────────────────────────────────

const usedPhones = new Set<string>();
const phoneCache = new Map<string, string>();

/**
 * คีย์คือเบอร์ที่ normalize แล้ว (ถ้า normalize ได้) เพื่อให้ 081-234-5678 กับ 0812345678
 * ยังเป็นเบอร์ซ้ำกันหลังแทน ส่วนเบอร์ที่ผิดรูปใช้ตัวเลขดิบเป็นคีย์และคงความยาวผิด ๆ ไว้
 */
function mockPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  const normalized = normalizePhone(raw);
  const key = normalized ? `n:${normalized}` : `r:${digits}`;
  let mock = phoneCache.get(key);

  if (!mock) {
    const base = normalized ?? digits;
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const bytes = hmac("phone", key, attempt);
      let candidate = base.slice(0, 2);
      for (let i = 2; i < base.length; i += 1) candidate += String(bytes[i] % 10);
      if (candidate === base || usedPhones.has(candidate)) continue;
      mock = candidate;
      break;
    }
    if (!mock) throw new Error("สร้างเบอร์สมมติไม่ซ้ำไม่ได้");
    usedPhones.add(mock);
    phoneCache.set(key, mock);
  }

  // เบอร์รูป 66xxxxxxxxx normalize เป็น 0xxxxxxxxx — ต้องพิมพ์กลับเป็นรูปเดิม
  const rendered =
    normalized && digits.startsWith("66") && digits.length === 11
      ? `66${mock.slice(1)}`
      : mock;

  let i = 0;
  return raw.replace(/\d/g, () => rendered[i++] ?? "");
}

/** เบอร์ที่ฝังในข้อความ: ขึ้นต้น 0 หรือ 66 ตามด้วยตัวเลขรวม 9–11 หลัก คั่นด้วยขีดหรือช่องว่างได้ */
const EMBEDDED_PHONE = /(?<!\d)(?:0|66)\d(?:[\s-]?\d){7,9}(?!\d)/g;
/** เบอร์มือถือที่พิมพ์ตกเลข 0 นำหน้า เจอจริงในหมายเหตุ */
const PHONE_WITHOUT_ZERO = /(?<!\d)[689]\d{8}(?!\d)/g;

// ─── เจ้าหน้าที่ ───────────────────────────────────────────────────────────

/**
 * ตารางชื่อเจ้าหน้าที่จริง → ชื่อสมมติ อยู่ในไฟล์ local ที่ไม่เข้า git
 * เพราะตัวสร้างต้องรู้ชื่อจริงถึงจะหาเจอ ถ้าเขียนไว้ในไฟล์นี้ ชื่อจริงจะเข้า git ไปกับโค้ด
 * รูปแบบดูที่ scripts/mock-staff.example.json
 */
const STAFF_MAP_PATH = "scripts/mock-staff.local.json";
type StaffMap = {
  /** ค่าในช่องผู้ดูแลหลังยุบวรรณยุกต์ → ชื่อสมมติ */
  owners: Record<string, string>;
  /**
   * ชื่อที่ฝังในช่องข้อความอิสระ — ชื่อสั้นที่บังเอิญเป็นคำทั่วไปด้วย
   * ให้ตั้ง onlyBeforeCall เพื่อแทนเฉพาะรูปที่ตามด้วย "โทร"
   */
  freeText: { real: string; mock: string; onlyBeforeCall?: boolean }[];
};
if (!existsSync(STAFF_MAP_PATH)) {
  console.error(`ไม่พบ ${STAFF_MAP_PATH} — สร้างจาก scripts/mock-staff.example.json แล้วใส่ชื่อจริงลงไป`);
  process.exit(1);
}
const staffMap = JSON.parse(readFileSync(STAFF_MAP_PATH, "utf8")) as StaffMap;

/** ยอมให้สระบนล่างและวรรณยุกต์แต่ละตัวในชื่อซ้ำกี่ครั้งก็ได้ */
const loosePattern = (word: string) =>
  [...word].map((c) => (MARK.test(c) ? `${c}+` : c)).join("");
const BEFORE_CALL = "(?=\\s*\\.?\\s*โทร)";

const FREE_TEXT_STAFF: [RegExp, string][] = staffMap.freeText.map(({ real, mock, onlyBeforeCall }) => [
  new RegExp(loosePattern(real) + (onlyBeforeCall ? BEFORE_CALL : ""), "g"),
  mock,
]);

/** ผู้โทรที่ขึ้นต้นช่องติดตาม หลังแทนแล้ว — ยาวก่อนสั้น ไม่งั้น "ต้น" จะกินหัว "ต้นกล้า" */
const MOCK_STAFF_NAMES = [
  ...new Set([...Object.values(staffMap.owners), ...staffMap.freeText.map((e) => e.mock)]),
].sort((a, b) => b.length - a.length);
const STAFF_PREFIX = new RegExp(
  `^\\s*(?:${MOCK_STAFF_NAMES.map(loosePattern).join("|")})?\\s*โทร\\.?`,
);

/** regex เดียวกับที่ parseFollowUp ใช้หาวันที่ — ต้องคงวันที่ตัวแรกไว้ตรงตัว */
const FOLLOW_UP_DATE = /(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/;
const FOLLOW_UP_TIME = /^\s*\d{1,2}[.:]\d{2}(?:\s*น\.)?/;

/**
 * คำบอกผลการโทรที่ parseFollowUp อ่านได้ผลเดิม — ลำดับการเช็คในนั้นสำคัญ
 * เช่น "ไม่สนใจเรียน" จะถูกอ่านเป็นสนใจ เพราะเช็ค "สนใจเรียน" ก่อน "ไม่สนใจ"
 * จึงห้ามมีคำของผลที่ถูกเช็คก่อนหน้าปนอยู่
 */
const OUTCOME_PHRASES: Record<string, string[]> = {
  ไม่รับสาย: ["ไม่รับสาย", "ปิดเครื่อง", "ไม่ได้รับสาย"],
  สมัครแล้ว: ["สมัครแล้ว", "สมัครเรียบร้อย รอส่งเอกสาร"],
  คุยแล้วสนใจ: ["สนใจสมัคร ขอเวลาตัดสินใจ", "สนใจเรียนภาคทางไกล", "สนใจสมัคร รอเงินเดือนออก"],
  คุยแล้วไม่สนใจ: ["ไม่สนใจแล้ว", "ได้ที่เรียนแล้ว", "ไม่สมัคร ทำงานไม่ว่าง"],
  นัดโทรใหม่: ["นัดโทรอีกครั้งสัปดาห์หน้า", "ขอให้ติดต่อใหม่ช่วงเย็น", "โทรใหม่หลังเลิกงาน"],
  ขอคิดดูก่อน: ["ขอปรึกษาครอบครัวก่อน", "ขอคิดดูก่อน", "ยังไม่ตัดสินใจ", "ขอดูค่าใช้จ่ายก่อน"],
};

/** หมายเหตุสมมติ — ไม่มีชื่อ ที่อยู่ หรือลักษณะที่ระบุตัวคนได้ */
const NOTE_POOL = [
  "สนใจกู้ กยศ.",
  "ขอเวลาตัดสินใจ",
  "ทำงานกะดึก โทรหลัง 18.00 น.",
  "ส่งวุฒิมาให้ดูเทียบโอนหน่วยกิต",
  "ถามเรื่องค่าเทอมและการผ่อน",
  "สะดวกคุยทางไลน์มากกว่า",
  "มีประกันสังคม ถามเรื่องสิทธิ์",
  "อยากเรียนเฉพาะเสาร์อาทิตย์",
  "นัดชำระ 500 บาท",
  "แอดไลน์กลับมาเรียบร้อยแล้ว",
  "จบ ปวส. ถามเรื่องเทียบโอน",
  "ขอเอกสารหลักสูตรทางไลน์",
  "ช่่วงเย็นสะดวกคุย",
  "รอปรึกษาที่บ้านก่อน",
  "สอบถามเรื่องทุนการศึกษา",
  "อายุ 32 ทำงานแล้ว",
  "ถามว่าต้องมาสอบที่มหาวิทยาลัยไหม",
  "เคยสมัครไว้ปีที่แล้ว",
];

function pick<T>(pool: readonly T[], kind: string, key: string): T {
  return pool[hmac(kind, key, 0).readUInt32BE(0) % pool.length];
}

function rebuildNote(cell: string): string {
  return cell.trim() ? pick(NOTE_POOL, "note", cell) : cell;
}

function rebuildFollowUp(original: string, scrubbed: string): string {
  // ช่องที่ไม่มีตัวอักษรเลย เช่น "/" หรือวันที่เปล่า ๆ ไม่มีอะไรให้ระบุตัวคน คงรูปเดิมไว้
  if (!HAS_LETTER.test(original)) return scrubbed;

  const parsed = parseFollowUp(original)!;
  const parts: string[] = [];

  const staff = scrubbed.match(STAFF_PREFIX)?.[0].trim();
  if (staff) parts.push(staff);

  const date = original.match(FOLLOW_UP_DATE)?.[1];
  if (date) {
    const after = original.slice(original.indexOf(date) + date.length);
    const time = after.match(FOLLOW_UP_TIME)?.[0].trim();
    parts.push(time ? `${date} ${time}` : date);
  }

  parts.push(pick(OUTCOME_PHRASES[parsed.outcome], "outcome", original));
  return parts.join(" ");
}

function mockOwner(raw: string): string {
  const key = cleanText(raw);
  if (!key) return raw;
  const mock = staffMap.owners[key];
  if (!mock) throw new Error(`ชื่อผู้ดูแลที่ไม่รู้จัก ต้องเพิ่มใน ${STAFF_MAP_PATH} ก่อน (${key.length} ตัวอักษร)`);
  const [, lead, core, trail] = raw.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return lead + injectRepeats(core, mock) + trail;
}

// ─── ช่องข้อความอิสระ ──────────────────────────────────────────────────────

function scrubFreeText(text: string, ownNameRuns: string[]): string {
  if (!text.trim()) return text;
  let out = text
    .replace(EMBEDDED_PHONE, (match) => mockPhoneDigits(match))
    .replace(PHONE_WITHOUT_ZERO, (match) => mockPhoneDigits(`0${match}`).slice(1));
  for (const [pattern, mock] of FREE_TEXT_STAFF) {
    out = out.replace(pattern, (match) => injectRepeats(match, mock));
  }
  // ชื่อของคนในแถวนั้นเองที่ถูกพิมพ์ซ้ำในหมายเหตุ
  for (const run of ownNameRuns) {
    out = out.replace(new RegExp(loosePattern(run), "g"), (match) => mockLetters(match));
  }
  // ตัวอักษรละตินในหมายเหตุภาษาไทยแทบทั้งหมดคือชื่อหรือไอดี แทนทิ้งทั้งหมด
  return out
    .replace(LATIN_RUN, (run) => matchCase(run, mockWord("latin", run)))
    .replace(OTHER_LETTER_RUN, (run) => mockWord("latin", `other:${run}`));
}

// ─── สร้าง ────────────────────────────────────────────────────────────────

const output = source.map((row, index) => {
  if (index < HEADER_ROWS) return [...row];

  const ownNameRuns = [
    ...(row[COL.name] ?? "").matchAll(THAI_RUN),
    ...(row[COL.name] ?? "").matchAll(LATIN_RUN),
  ]
    .map((m) => collapseThaiDuplicates(m[0]))
    .filter((run) => run.length >= 3);

  return row.map((cell, col) => {
    if (col === COL.name) return mockLetters(cell);
    if (col === COL.phone) return mockPhoneDigits(cell);
    if (col === COL.owner) return mockOwner(cell);
    if (col === COL.note) return rebuildNote(cell);
    if ((COL.allFollowUps as readonly number[]).includes(col)) {
      return rebuildFollowUp(cell, scrubFreeText(cell, ownNameRuns));
    }
    if (col === COL.callTime) return scrubFreeText(cell, ownNameRuns);
    return cell;
  });
});

// ─── ตรวจตัวเองก่อนเขียน ─────────────────────────────────────────────────

const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures.push(what);
};

const dataOf = (rows: string[][]) => rows.slice(HEADER_ROWS);
const realRows = dataOf(source);
const mockRows = dataOf(output);

/** แบ่งแถวเป็นกลุ่มตามคีย์ แล้วเทียบว่าแถวอยู่กลุ่มเดียวกันเหมือนเดิมไหม */
function samePartition(key: (row: string[]) => string | null): boolean {
  const signature = (rows: string[][]) => {
    const groups = new Map<string, number[]>();
    rows.forEach((row, i) => {
      const k = key(row);
      if (k) groups.set(k, [...(groups.get(k) ?? []), i]);
    });
    return [...groups.values()]
      .filter((g) => g.length > 1)
      .map((g) => g.join(","))
      .sort()
      .join("|");
  };
  return signature(realRows) === signature(mockRows);
}

const countWhere = (rows: string[][], col: number, test: (cell: string) => boolean) =>
  rows.filter((row) => test(row[col] ?? "")).length;
const hasRepeats = (cell: string) => collapseThaiDuplicates(cell) !== cell;

check(
  source.length === output.length && source.every((r, i) => r.length === output[i].length),
  `จำนวนแถว (${realRows.length}) และจำนวนคอลัมน์ทุกแถวเท่าเดิม`,
);
check(
  source.every((row, i) =>
    row.every((cell, col) => i < HEADER_ROWS || TOUCHED.has(col) || cell === output[i][col]),
  ),
  "คอลัมน์ที่ไม่ใช่ข้อมูลส่วนบุคคลไม่ถูกแตะเลยสักเซลล์ (วันที่ คณะ สาขา วุฒิ ภาค ช่องวันที่ให้โทร)",
);
check(
  source.slice(0, HEADER_ROWS).every((r, i) => r.join("\0") === output[i].join("\0")),
  "หัวตารางเหมือนเดิม",
);
check(
  samePartition((row) => cleanText(row[COL.name]) || null),
  "ชื่อซ้ำยังซ้ำเป็นกลุ่มเดิมทุกกลุ่ม (คีย์เดียวกับสคริปต์นำเข้า)",
);
check(
  samePartition((row) => normalizePhone(row[COL.phone])),
  "เบอร์ซ้ำยังซ้ำเป็นกลุ่มเดิมทุกกลุ่ม",
);
check(
  countWhere(realRows, COL.phone, (c) => !!c.trim() && !normalizePhone(c)) ===
    countWhere(mockRows, COL.phone, (c) => !!c.trim() && !normalizePhone(c)),
  "เบอร์ที่ผิดรูปยังผิดรูปจำนวนเท่าเดิม",
);
check(
  countWhere(realRows, COL.name, hasRepeats) === countWhere(mockRows, COL.name, hasRepeats) &&
    countWhere(realRows, COL.owner, hasRepeats) === countWhere(mockRows, COL.owner, hasRepeats),
  `เซลล์ที่มีวรรณยุกต์ซ้ำเท่าเดิม (ชื่อ ${countWhere(realRows, COL.name, hasRepeats)} · ผู้ดูแล ${countWhere(realRows, COL.owner, hasRepeats)})`,
);
check(
  samePartition((row) => cleanText(row[COL.owner]) || null) &&
    new Set(realRows.map((r) => r[COL.owner] ?? "")).size ===
      new Set(mockRows.map((r) => r[COL.owner] ?? "")).size,
  `ชื่อผู้ดูแลยังเขียนหลายแบบเท่าเดิม (${new Set(realRows.map((r) => r[COL.owner] ?? "").filter((c) => c.trim())).size} แบบ)`,
);
check(
  realRows.every((row, i) =>
    COL.followUps.every((col) => {
      const a = parseFollowUp(row[col] ?? null);
      const b = parseFollowUp(mockRows[i][col] ?? null);
      return a?.outcome === b?.outcome && a?.occurredAt === b?.occurredAt;
    }),
  ),
  "ช่องติดตามแปลงเป็นผลการโทรและวันที่ได้เหมือนเดิมทุกช่อง",
);
check(
  realRows.every(
    (row, i) =>
      JSON.stringify(parseCallDateField(row[COL.callDate] ?? null)) ===
      JSON.stringify(parseCallDateField(mockRows[i][COL.callDate] ?? null)),
  ),
  "ช่องวันที่ให้โทรแปลงได้เหมือนเดิมทุกช่อง",
);

// ข้อมูลจริงต้องไม่หลุด
const mockText = mockRows.map((r) => collapseThaiDuplicates(r.join("\n"))).join("\n");
const mockDigits = mockRows.map((r) => r.join(" ").replace(/[^\d]/g, " ")).join(" ");

const realNames = new Set(realRows.map((r) => cleanText(r[COL.name])).filter(Boolean));
const leakedInNameColumn = mockRows.filter((r) => realNames.has(cleanText(r[COL.name]))).length;
check(
  leakedInNameColumn === 0,
  `ไม่มีแถวไหนได้ชื่อที่ตรงกับชื่อคนจริง (ตรวจ ${realNames.size} ชื่อ · ตรง ${leakedInNameColumn})`,
);

const freeTextOf = (rows: string[][]) =>
  rows.map((r) => collapseThaiDuplicates(FREE_TEXT.map((col) => r[col] ?? "").join("\n"))).join("\n");
const mockFreeText = freeTextOf(mockRows);
const leakedInFreeText = [...realNames].filter((n) => n.length >= 5 && mockFreeText.includes(n)).length;
check(leakedInFreeText === 0, `ไม่มีชื่อเต็มของคนจริงในช่องข้อความอิสระ (หลุด ${leakedInFreeText})`);

const realLatinTokens = new Set(
  realRows.flatMap((r) => (r[COL.name] ?? "").match(LATIN_RUN) ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 4),
);
const mockFreeTextLatin = new Set(
  mockRows.flatMap((r) => FREE_TEXT.flatMap((col) => (r[col] ?? "").match(LATIN_RUN) ?? [])).map((t) => t.toLowerCase()),
);
const leakedTokens = [...realLatinTokens].filter((t) => mockFreeTextLatin.has(t)).length;
check(leakedTokens === 0, `ไม่มีชื่อภาษาอังกฤษของคนจริงในช่องข้อความอิสระ (หลุด ${leakedTokens})`);

const realPhones = new Set(
  realRows.flatMap((r) => [
    normalizePhone(r[COL.phone]),
    ...FREE_TEXT.flatMap((col) => (r[col] ?? "").match(EMBEDDED_PHONE) ?? []).map((m) => normalizePhone(m)),
    ...FREE_TEXT.flatMap((col) => (r[col] ?? "").match(PHONE_WITHOUT_ZERO) ?? []).map((m) => normalizePhone(`0${m}`)),
  ]).filter((p): p is string => !!p),
);
const leakedPhones = [...realPhones].filter((p) => mockDigits.includes(p.slice(1))).length;
check(leakedPhones === 0, `ไม่มีเบอร์จริงหลงอยู่ในไฟล์ (ตรวจ ${realPhones.size} เบอร์ · หลุด ${leakedPhones})`);

const staffLeaks = staffMap.freeText.filter(({ real, onlyBeforeCall }) =>
  new RegExp(collapseThaiDuplicates(real) + (onlyBeforeCall ? BEFORE_CALL : "")).test(mockText),
);
const ownerLeaks = mockRows.some((r) => cleanText(r[COL.owner]) in staffMap.owners);
check(
  staffLeaks.length === 0 && !ownerLeaks,
  "ไม่มีชื่อเจ้าหน้าที่จริงหลงอยู่ในไฟล์",
);

check(
  realRows.every((row, i) => !cleanText(row[COL.name]) || cleanText(row[COL.name]) !== cleanText(mockRows[i][COL.name])),
  "ชื่อทุกแถวถูกเปลี่ยน",
);

// whitelist: ช่องที่สร้างใหม่ต้องมีแต่ข้อความที่สคริปต์นี้ผลิตเอง — ไม่มีทางมีข้อมูลจริงหลุด
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const allPhrases = Object.values(OUTCOME_PHRASES).flat().map(escape).join("|");
const generatedFollowUp = new RegExp(
  `^(?:${STAFF_PREFIX.source.slice(1)}\\s)?` +
    `(?:${FOLLOW_UP_DATE.source}(?:\\s\\d{1,2}[.:]\\d{2}(?:\\s*น\\.)?)?\\s)?` +
    `(?:${allPhrases})$`,
);
const notePool = new Set(NOTE_POOL);
const strayNotes = mockRows.filter((r) => (r[COL.note] ?? "").trim() && !notePool.has(r[COL.note])).length;
check(strayNotes === 0, `หมายเหตุทุกช่องมาจากชุดข้อความสมมติ (นอกชุด ${strayNotes})`);

const strayFollowUps = mockRows.flatMap((r) =>
  COL.allFollowUps.map((col) => r[col] ?? "").filter(
    (cell) => HAS_LETTER.test(cell) && !generatedFollowUp.test(cell),
  ),
).length;
check(strayFollowUps === 0, `ช่องติดตามทุกช่องที่มีตัวอักษรเป็นรูปที่สคริปต์สร้างเอง (นอกรูป ${strayFollowUps})`);

/** เลขยาวเจ็ดหลักขึ้นไปในช่องที่ไม่ได้สร้างใหม่ ต้องเป็นเบอร์ที่สคริปต์นี้แทนแล้วเท่านั้น */
const mockPhones = new Set([...phoneCache.values()].flatMap((p) => [p, p.slice(1), `66${p.slice(1)}`]));
const hasUnmockedLongNumber = (cell: string) =>
  (cell.replace(/[\s-]/g, "").match(/\d{7,}/g) ?? []).some((run) => !mockPhones.has(run));
const strayCallTimes = mockRows.filter(
  (r) => /[A-Za-z]/.test(r[COL.callTime] ?? "") || hasUnmockedLongNumber(r[COL.callTime] ?? ""),
).length;
check(strayCallTimes === 0, `ช่องช่วงเวลาให้ติดต่อไม่มีตัวอักษรละตินหรือเลขยาวที่ไม่ได้แทน (พบ ${strayCallTimes})`);

const strayNumbers = mockRows.flatMap((r) =>
  COL.allFollowUps.map((col) => r[col] ?? "").filter((cell) => !HAS_LETTER.test(cell) && hasUnmockedLongNumber(cell.replace(/\d{1,2}[/-]\d{1,2}[/-]\d{4}/g, ""))),
).length;
check(strayNumbers === 0, `ช่องติดตามที่ไม่มีตัวอักษรไม่มีเลขยาวที่ไม่ได้แทน (พบ ${strayNumbers})`);

if (failures.length > 0) {
  console.error(`\nไม่เขียนไฟล์ — ตรวจไม่ผ่าน ${failures.length} ข้อ`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, toCsv(output));
console.log(`\nเขียน ${outPath} แล้ว (${realRows.length} แถว)`);
