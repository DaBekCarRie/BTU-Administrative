import { listAccessLog } from "@/lib/data/national-id";
import { formatThaiDateTime } from "@/lib/date";

/**
 * ADR-0004: ไม่กั้นสิทธิ์ว่าใครเปิดดูอะไรได้ แต่ทุกการเปิดดูข้อมูลอ่อนไหวมีร่องรอย
 * RLS อนุญาตให้อ่านตารางนี้ได้เฉพาะหัวหน้าทีม — เจ้าหน้าที่ทั่วไปจะเห็นรายการว่าง
 */
export default async function AccessLogPage() {
  const entries = await listAccessLog();

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">ร่องรอยการเข้าถึงข้อมูลอ่อนไหว</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {entries.length} รายการล่าสุด · หัวหน้าทีมเท่านั้นที่เห็นหน้านี้
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">ยังไม่มีร่องรอยการเข้าถึง</p>
          <p className="text-muted-foreground mt-1 text-sm">
            หรือบัญชีของคุณไม่ใช่หัวหน้าทีม จึงไม่มีสิทธิ์อ่านรายการนี้
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b">
                {["เมื่อไหร่", "ใคร", "ทำอะไร", "ของใคร"].map((label) => (
                  <th
                    key={label}
                    className="text-muted-foreground px-3 py-1.5 text-left text-xs font-normal whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="access-log-rows">
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="text-muted-foreground px-3 py-1.5 whitespace-nowrap">
                    {formatThaiDateTime(entry.viewedAt)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {entry.viewedByName ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">{entry.what}</td>
                  <td className="px-3 py-1.5">{entry.personName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
