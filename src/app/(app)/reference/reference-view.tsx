"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferenceItem } from "@/lib/data/reference-documents";
import { formatThaiDate, thaiYearNow } from "@/lib/date";
import { prepareUpload } from "@/lib/prepare-upload";
import { REFERENCE_CATEGORIES, referenceStoragePath } from "@/lib/reference-shared";
import { createClient } from "@/lib/supabase/client";

import {
  createReferenceDocument,
  deleteReferenceDocument,
  openReferenceFile,
  recordReferenceFile,
  updateReferenceDocument,
} from "./actions";

const selectClass = "border-input bg-background h-9 rounded-md border px-3 text-sm";
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** ปีการศึกษาให้เลือก: ปีหน้าย้อนไปห้าปี — ตารางสอบเก่ากว่านั้นแทบไม่ได้เปิด */
function yearOptions(): number[] {
  const now = thaiYearNow();
  return Array.from({ length: 7 }, (_, index) => now + 1 - index);
}

/**
 * ย่อรูปแล้วอัปโหลดขึ้น bucket `reference` ทีละไฟล์ แล้วบันทึกลงตาราง
 * กลไกเดียวกับเอกสารประจำตัว — ไฟล์ไม่ผ่านเซิร์ฟเวอร์ของเรา
 */
async function uploadFiles(documentId: string, files: File[]): Promise<{ uploaded: number; errors: string[] }> {
  const supabase = createClient();
  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    const prepared = await prepareUpload(file);
    const mimeType = prepared.type || file.type;
    const path = referenceStoragePath(documentId, crypto.randomUUID(), mimeType);
    if (!path) {
      errors.push(`${file.name}: รับเฉพาะรูปภาพและ PDF`);
      continue;
    }

    const { error } = await supabase.storage.from("reference").upload(path, prepared);
    if (error) {
      errors.push(`${file.name}: ${error.message}`);
      continue;
    }

    const result = await recordReferenceFile(documentId, {
      storagePath: path,
      fileName: file.name,
      mimeType,
      sizeBytes: prepared.size,
    });
    if (result.error) {
      errors.push(`${file.name}: ${result.error}`);
      continue;
    }
    uploaded += 1;
  }

  return { uploaded, errors };
}

function ReferenceFields({ item }: { item?: ReferenceItem }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reference-category">หมวด</Label>
        <select
          id="reference-category"
          name="category"
          required
          defaultValue={item?.category ?? ""}
          className={selectClass}
        >
          <option value="" disabled>
            เลือกหมวด
          </option>
          {REFERENCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reference-title">ชื่อเรื่อง</Label>
        <Input
          id="reference-title"
          name="title"
          required
          maxLength={200}
          defaultValue={item?.title ?? ""}
          placeholder="เช่น ตารางสอบภาค 1/2569 ภาคทางไกล"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reference-year">ปีการศึกษา</Label>
        <select
          id="reference-year"
          name="academicYear"
          defaultValue={item ? String(item.academicYear ?? "") : String(thaiYearNow())}
          className={selectClass}
        >
          <option value="">ไม่ผูกกับปี</option>
          {yearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
          {item?.academicYear && !yearOptions().includes(item.academicYear) ? (
            <option value={item.academicYear}>{item.academicYear}</option>
          ) : null}
        </select>
      </div>
    </>
  );
}

function readInput(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    academicYear: String(formData.get("academicYear") ?? ""),
  };
}

function reportUpload(result: { uploaded: number; errors: string[] }) {
  for (const error of result.errors) toast.error(`อัปโหลดไม่สำเร็จ — ${error}`);
  if (result.uploaded > 0) toast.success(`แนบไฟล์แล้ว ${result.uploaded} ไฟล์`);
}

export function AddReferenceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

    startTransition(async () => {
      const created = await createReferenceDocument(readInput(formData));
      if (created.error || !created.id) {
        setError(created.error ?? "บันทึกไม่สำเร็จ");
        return;
      }

      // รายการถูกสร้างแล้ว ถ้าไฟล์บางไฟล์พัง ยังแนบเพิ่มทีหลังได้ ไม่ต้องกรอกใหม่
      if (files.length > 0) reportUpload(await uploadFiles(created.id, files));
      else toast.success("เพิ่มเอกสารอ้างอิงแล้ว");

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-reference">เพิ่มเอกสารอ้างอิง</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>เพิ่มเอกสารอ้างอิง</DialogTitle>
        </DialogHeader>

        <form action={submit} className="mt-2 flex flex-col gap-4">
          <ReferenceFields />

          <div className="flex flex-col gap-2">
            <Label htmlFor="reference-files">ไฟล์ (เลือกได้หลายไฟล์)</Label>
            <Input id="reference-files" name="files" type="file" multiple accept={ACCEPT} />
            <p className="text-muted-foreground text-xs">รับรูปภาพและ PDF · รูปจะถูกย่อขนาดอัตโนมัติ</p>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditReferenceDialog({ item }: { item: ReferenceItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateReferenceDocument(item.id, readInput(formData));
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("แก้เอกสารอ้างอิงแล้ว");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="edit-reference">
          แก้
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>แก้เอกสารอ้างอิง</DialogTitle>
        </DialogHeader>
        <form action={submit} className="mt-2 flex flex-col gap-4">
          <ReferenceFields item={item} />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AttachFilesButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex">
      <input
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        data-testid="attach-reference-files"
        disabled={pending}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length === 0) return;
          startTransition(async () => {
            reportUpload(await uploadFiles(documentId, files));
            router.refresh();
          });
        }}
      />
      <span className="border-input hover:bg-accent inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm">
        {pending ? "กำลังแนบ…" : "แนบไฟล์"}
      </span>
    </label>
  );
}

function OpenFileButton({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0"
      data-testid="reference-file"
      disabled={pending}
      onClick={() => {
        // เปิดแท็บก่อนรอลิงก์ ไม่งั้นเบราว์เซอร์นับว่าไม่ใช่การกดของคนแล้วบล็อกป๊อปอัป
        const tab = window.open("", "_blank");
        startTransition(async () => {
          const result = await openReferenceFile(fileId);
          if (result.error || !result.url) {
            tab?.close();
            toast.error(result.error ?? "เปิดไฟล์ไม่สำเร็จ");
            return;
          }
          if (tab) tab.location.href = result.url;
          else window.location.href = result.url;
        });
      }}
    >
      {fileName}
    </Button>
  );
}

/** ลบย้อนไม่ได้ — ถามยืนยันพร้อมบอกว่าไฟล์จะหายด้วยกี่ไฟล์ */
function DeleteReferenceDialog({ item }: { item: ReferenceItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive" data-testid="delete-reference">
          ลบ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>ลบเอกสารอ้างอิงนี้?</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          “{item.title}” และไฟล์ทั้ง {item.files.length} ไฟล์จะถูกลบ <strong>ลบแล้วกู้คืนไม่ได้</strong>
        </p>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            data-testid="confirm-delete-reference"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteReferenceDocument(item.id);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("ลบเอกสารอ้างอิงแล้ว");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "กำลังลบ…" : "ลบถาวร"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReferenceList({
  items,
  canDelete,
  filtered,
}: {
  items: ReferenceItem[];
  /** หัวหน้าทีมเท่านั้น — เจ้าหน้าที่ไม่เห็นปุ่มเลย ไม่ใช่ปุ่มสีจางกดไม่ได้ */
  canDelete: boolean;
  filtered: boolean;
}) {
  if (items.length === 0 && filtered) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-medium">ไม่พบเอกสารอ้างอิงที่ตรงกับตัวกรอง</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-medium">ยังไม่มีเอกสารอ้างอิง</p>
        <p className="text-muted-foreground mt-1 text-sm">
          เพิ่มตารางสอบ ปฏิทินการศึกษา แบบฟอร์ม หรือประกาศที่ทีมต้องเปิดดูบ่อย
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="reference-list">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border p-4" data-testid="reference-item" data-reference-id={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-medium break-words">{item.title}</h2>
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.category}
                </span>
                <span data-testid="reference-year">
                  {item.academicYear ? `ปีการศึกษา ${item.academicYear}` : "ไม่ผูกกับปี"}
                </span>
                <span>
                  อัปโหลดโดย {item.uploadedByName ?? "—"} · {formatThaiDate(item.createdAt)}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <AttachFilesButton documentId={item.id} />
              <EditReferenceDialog item={item} />
              {canDelete ? <DeleteReferenceDialog item={item} /> : null}
            </div>
          </div>

          {item.files.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">ยังไม่มีไฟล์ — กด “แนบไฟล์”</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {item.files.map((file) => (
                <li key={file.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">
                    {file.mimeType === "application/pdf" ? "PDF" : "รูป"}
                  </span>
                  <OpenFileButton fileId={file.id} fileName={file.fileName} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
