/** ค่าแรกของ query param ตัดช่องว่างหัวท้าย — `?a=1&a=2` หรือไม่มีค่า ถือว่าว่าง */
export function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}
