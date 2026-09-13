/**
 * อ่านและเขียน CSV ของชีทเดิม — รองรับเครื่องหมายคำพูดและขึ้นบรรทัดใหม่ในเซลล์
 * ใช้ร่วมกันระหว่างสคริปต์นำเข้ากับสคริปต์สร้างไฟล์สมมติ
 * เพื่อให้ไฟล์ที่เขียนออกไปอ่านกลับได้ตรงทุกเซลล์
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  const quote = (cell: string) =>
    /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  return rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
}
