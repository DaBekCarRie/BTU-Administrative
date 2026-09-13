"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  openDocument,
  recordUpload,
  reviewDocument,
} from "@/app/(app)/documents/actions";
import type { DocumentChecklist } from "@/lib/data/documents";
import { DOC_TYPE_SLUG, type DocType } from "@/lib/documents-shared";
import { prepareUpload } from "@/lib/prepare-upload";
import { createClient } from "@/lib/supabase/client";


export function DocumentChecklistPanel({
  personId,
  checklist,
}: {
  personId: string;
  checklist: DocumentChecklist;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(docType: DocType, file: File) {
    setBusy(docType);
    try {
      const prepared = await prepareUpload(file);

      const extension = file.name.split(".").pop() ?? "bin";
      const path = `${personId}/${DOC_TYPE_SLUG[docType]}-${Date.now()}.${extension}`;

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, prepared, { upsert: true });

      if (error) {
        toast.error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
        console.error("storage upload failed", error);
        return;
      }

      const result = await recordUpload(personId, docType, path);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const saved = Math.round((1 - prepared.size / file.size) * 100);
      toast.success(
        prepared.size < file.size
          ? `อัปโหลด ${docType} แล้ว (ย่อขนาดลง ${saved}%)`
          : `อัปโหลด ${docType} แล้ว`,
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function review(id: string, status: "ผ่าน" | "ไม่ผ่าน") {
    const reason =
      status === "ไม่ผ่าน"
        ? window.prompt("ไม่ผ่านเพราะอะไร (คนรับงานต่อจะเห็นข้อความนี้)")
        : null;
    if (status === "ไม่ผ่าน" && !reason) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("personId", personId);
      formData.set("status", status);
      if (reason) formData.set("rejectReason", reason);

      const result = await reviewDocument({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`บันทึกผลตรวจ: ${status}`);
      router.refresh();
    });
  }

  function open(item: DocumentChecklist["items"][number]) {
    startTransition(async () => {
      // ฝั่งเซิร์ฟเวอร์ตัดสินเองว่าอ่อนไหวไหมและ path อะไร — ไม่รับจากตรงนี้
      const result = await openDocument(item.id, personId);
      if (result.error || !result.url) {
        toast.error(result.error ?? "เปิดเอกสารไม่สำเร็จ");
        return;
      }
      window.open(result.url, "_blank", "noopener");
    });
  }

  const byType = new Map(checklist.items.map((item) => [item.docType, item]));
  const allTypes = [
    ...checklist.items.map((item) => item.docType),
    ...checklist.missing,
  ].filter((type, index, list) => list.indexOf(type) === index);

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">เอกสารประจำตัว</h2>
        <span className="text-muted-foreground text-xs" data-testid="doc-progress">
          ผ่านแล้ว {checklist.completed}/{checklist.total}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {allTypes.map((docType) => {
          const item = byType.get(docType);
          return (
            <li
              key={docType}
              data-testid={`doc-${docType}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(docType);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);
                const file = event.dataTransfer.files[0];
                if (file) void upload(docType, file);
              }}
              className={`rounded-md border border-dashed p-3 transition-colors ${
                dragOver === docType ? "border-primary bg-accent" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{docType}</span>
                {item ? (
                  <Badge
                    variant={
                      item.status === "ผ่าน"
                        ? "default"
                        : item.status === "ไม่ผ่าน"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">ยังไม่ส่ง</Badge>
                )}
              </div>

              {item?.rejectReason ? (
                <p className="text-destructive mt-1 text-xs">
                  เหตุผล: {item.rejectReason}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  ref={(element) => {
                    inputs.current[docType] = element;
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  data-testid={`file-${docType}`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(docType, file);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === docType}
                  onClick={() => inputs.current[docType]?.click()}
                  data-testid={`upload-${docType}`}
                >
                  {busy === docType
                    ? "กำลังอัปโหลด…"
                    : item
                      ? "อัปโหลดใหม่"
                      : "อัปโหลด"}
                </Button>

                {item ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => open(item)}
                      data-testid={`open-${docType}`}
                    >
                      {item.isSensitive ? "แสดงเอกสาร" : "เปิดดู"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => review(item.id, "ผ่าน")}
                      data-testid={`pass-${docType}`}
                    >
                      ผ่าน
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => review(item.id, "ไม่ผ่าน")}
                      data-testid={`reject-${docType}`}
                    >
                      ไม่ผ่าน
                    </Button>
                  </>
                ) : null}
              </div>

              {item?.isSensitive ? (
                <div className="mt-2">
                  {/* เบลอไว้ก่อน กันไม่ให้เลขบัตรคนอื่นค้างบนจอตอนมีคนเดินผ่าน */}
                  <div
                    aria-hidden
                    data-testid={`blurred-${docType}`}
                    className="bg-muted text-muted-foreground flex h-16 items-center justify-center rounded-md text-xs blur-[3px] select-none"
                  >
                    เอกสารอ่อนไหว
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    เอกสารนี้อ่อนไหว การเปิดดูจะถูกบันทึกไว้
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground mt-3 text-xs">
        ลากไฟล์มาวางบนช่องใดก็ได้ · รูปจะถูกย่อขนาดอัตโนมัติก่อนอัปโหลด
      </p>
    </div>
  );
}
