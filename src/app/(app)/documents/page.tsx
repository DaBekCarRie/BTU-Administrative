import { listDeskSubmissions } from "@/lib/data/documents";
import { currentStaffId } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { DocumentDesk } from "./document-desk";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const staffId = await currentStaffId();
  let staffName = "เจ้าหน้าที่";
  if (staffId) {
    const { data: staff } = await supabase
      .from("staff")
      .select("display_name")
      .eq("id", staffId)
      .maybeSingle();
    if (staff?.display_name) staffName = staff.display_name;
  }

  const { submissions, total, truncated } = await listDeskSubmissions();

  return (
    <DocumentDesk
      initialSubmissions={submissions}
      total={total}
      truncated={truncated}
      staffName={staffName}
    />
  );
}
