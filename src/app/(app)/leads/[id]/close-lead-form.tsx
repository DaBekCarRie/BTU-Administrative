"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CLOSE_REASONS, type CloseReason } from "@/lib/domain/events";
import { closeLead } from "../actions";

export function CloseLeadForm({
  personId,
  alreadyClosed,
}: {
  personId: string;
  alreadyClosed: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alreadyClosed) return null;

  function close(reason: CloseReason) {
    setError(null);
    const formData = new FormData();
    formData.set("personId", personId);
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await closeLead({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(`ปิดเคสแล้ว: ${reason}`);
      // สถานะอยู่ใน server component ต้องสั่งดึงใหม่เอง
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border p-4">
      <h2 className="text-sm font-semibold">ปิดเคส</h2>
      <p className="text-muted-foreground mt-1 mb-3 text-xs">
        ปิดแล้วจะไม่โผล่ในคิวโทรอีก แต่ประวัติยังอยู่ครบ
      </p>
      <div className="flex flex-col gap-2">
        {CLOSE_REASONS.map((reason) => (
          <Button
            key={reason}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            data-testid={`close-${reason}`}
            onClick={() => close(reason)}
          >
            {reason}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
