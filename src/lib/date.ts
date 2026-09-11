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
