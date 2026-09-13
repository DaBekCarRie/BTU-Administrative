import { NextResponse, type NextRequest } from "next/server";

import { listPeopleForExport } from "@/lib/data/people";
import { currentStaffId } from "@/lib/data/staff";
import { parseFilters } from "@/lib/data/people-filters";
import { formatThaiDate } from "@/lib/date";
import { formatPhone } from "@/lib/phone";

const HEADERS = [
  "ชื่อ",
  "เบอร์โทร",
  "ชื่อ Facebook",
  "คณะ",
  "สาขา",
  "ภาค",
  "สถานะติดตาม",
  "ผู้ดูแล",
  "บันทึกล่าสุด",
];

function cell(value: string | null): string {
  const text = value ?? "";
  // นำหน้าด้วยเครื่องหมายวรรคตอนที่ Excel ตีความเป็นสูตร ต้องตัดฤทธิ์
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * ส่งออกเฉพาะผลลัพธ์ที่กรองอยู่ ไม่ใช่ทั้งตาราง
 * เป็น CSV ที่มี BOM เพื่อให้ Excel อ่านภาษาไทยถูก
 */
export async function GET(request: NextRequest) {
  // route handler ไม่วิ่งผ่าน layout จึงไม่ได้ด่านเจ้าหน้าที่ที่หน้าจออื่นมี ต้องตรวจเอง
  // RLS กันข้อมูลไว้แล้ว แต่ถ้าไม่ตรวจ คนนอกจะได้ไฟล์ว่างที่ดูเหมือนสำเร็จ แทนที่จะรู้ว่าไม่มีสิทธิ์
  if (!(await currentStaffId())) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งออกข้อมูล" }, { status: 403 });
  }

  const filters = parseFilters(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const people = await listPeopleForExport(filters);

  const rows = people.map((person) =>
    [
      person.fullName,
      person.phone ? formatPhone(person.phone) : null,
      person.facebookName,
      person.facultyName,
      person.programName,
      person.studyMode,
      person.followUpStatus,
      person.ownerName,
      formatThaiDate(person.updatedAt),
    ]
      .map(cell)
      .join(","),
  );

  const csv = `﻿${HEADERS.map(cell).join(",")}\n${rows.join("\n")}\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="btu-leads-${stamp}.csv"`,
    },
  });
}
