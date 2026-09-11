"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyListButton({
  centerName,
  lines,
}: {
  centerName: string;
  lines: string[];
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      data-testid={`copy-${centerName}`}
      onClick={async () => {
        const text = `ศูนย์${centerName}\n${lines
          .map((line, index) => `${index + 1}.${line}`)
          .join("\n")}`;
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success(`คัดลอกรายชื่อศูนย์${centerName}แล้ว`);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("คัดลอกไม่สำเร็จ เบราว์เซอร์ไม่อนุญาต");
        }
      }}
    >
      {copied ? "คัดลอกแล้ว" : "คัดลอกรายชื่อ"}
    </Button>
  );
}
