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
import { Textarea } from "@/components/ui/textarea";
import { Constants } from "@/types/database";
import { confirmAnswer, createAnswer } from "./actions";

export function ConfirmAnswerButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid={`confirm-${id}`}
      onClick={() =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set("id", id);
          const result = await confirmAnswer({}, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("ยืนยันแล้วว่ายังถูกต้อง");
          router.refresh();
        })
      }
    >
      ยืนยันว่ายังถูกต้อง
    </Button>
  );
}

export function AddAnswerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAnswer({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success("เพิ่มคำถามแล้ว");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-answer">เพิ่มคำถาม</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>เพิ่มคำถาม</DialogTitle>
        </DialogHeader>

        <form action={submit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="question">คำถาม</Label>
            <Input id="question" name="question" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="answer">คำตอบ</Label>
            <Textarea id="answer" name="answer" rows={4} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="visibility">ใช้ตอบใครได้บ้าง</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue="ตอบผู้สนใจได้"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {Constants.public.Enums.answer_visibility.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="source">ที่มาของคำตอบ</Label>
            <Input
              id="source"
              name="source"
              placeholder="เช่น สำนักทะเบียนแจ้งทางไลน์ 5 ก.ย. 69"
            />
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} data-testid="submit-answer">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
