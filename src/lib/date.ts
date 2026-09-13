import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/th";

dayjs.extend(buddhistEra);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("th");

export const TZ = "Asia/Bangkok";

type DateInput = string | number | Date | null | undefined;

/** 11 ก.ย. 2569 */
export function formatThaiDate(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).tz(TZ).format("D MMM BBBB");
}

/** 11 ก.ย. 2569 14:30 */
export function formatThaiDateTime(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).tz(TZ).format("D MMM BBBB HH:mm");
}

/** "3 วันที่แล้ว" */
export function fromNowThai(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).tz(TZ).fromNow();
}

/** จำนวนวันที่ค้างมาแล้ว (ติดลบ = ยังไม่ถึงกำหนด) */
export function daysOverdue(value: DateInput): number | null {
  if (!value) return null;
  return dayjs().tz(TZ).startOf("day").diff(dayjs(value).tz(TZ).startOf("day"), "day");
}

/**
 * ฐานข้อมูลเก็บ ค.ศ. เสมอ — ฟังก์ชันนี้คือทางเดียวที่ควรใช้แปลงเป็น พ.ศ.
 * อย่าเขียน +543 กระจายไว้ตามหน้าจอ
 */
export { dayjs };

/**
 * ค่า YYYY-MM-DD สำหรับ <input type="date"> โดยอิงวันตามเวลาไทย
 *
 * ห้ามใช้ `new Date().toISOString().slice(0,10)` แทน เพราะ toISOString แปลงเป็น UTC
 * ช่วงเที่ยงคืนถึง 7 โมงเช้าเวลาไทย UTC ยังเป็นเมื่อวาน วันที่จะเพี้ยนไปหนึ่งวัน
 */
export function toDateInputValue(offsetDays = 0): string {
  return dayjs().tz(TZ).add(offsetDays, "day").format("YYYY-MM-DD");
}

/** ปี พ.ศ. ปัจจุบันตามเวลาไทย — ค่าเริ่มต้นของช่องปีการศึกษา */
export function thaiYearNow(): number {
  return Number(dayjs().tz(TZ).format("BBBB"));
}

/** ต้นวันนี้ตามเวลาไทย ในรูป ISO (UTC) สำหรับส่งเข้า query */
export function startOfTodayBangkok(): string {
  return dayjs().tz(TZ).startOf("day").toISOString();
}

/** สิ้นวันนี้ตามเวลาไทย ในรูป ISO (UTC) สำหรับส่งเข้า query */
export function endOfTodayBangkok(): string {
  return dayjs().tz(TZ).endOf("day").toISOString();
}

/**
 * ช่วงเดือนตามเวลาไทย [from, to) ในรูป ISO (UTC) สำหรับส่งเข้า query
 * offsetMonths 0 = เดือนนี้ · -1 = เดือนที่แล้ว
 *
 * ต้องคิดจากเวลาไทย ไม่ใช่ UTC — ตอนเช้าตรู่วันที่ 1 UTC ยังเป็นเดือนก่อน
 */
export function monthRangeBangkok(offsetMonths = 0): {
  from: string;
  to: string;
  label: string;
} {
  const start = dayjs().tz(TZ).startOf("month").add(offsetMonths, "month");
  return {
    from: start.toISOString(),
    to: start.add(1, "month").toISOString(),
    label: start.format("MMM BBBB"),
  };
}
