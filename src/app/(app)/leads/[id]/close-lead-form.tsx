"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CLOSE_REASONS } from "@/lib/domain/events";
import { closeLead, type LeadFormState } from "../actions";

export function CloseLeadForm({
  personId,
  alreadyClosed,
}: {
  personId: string;
  alreadyClosed: boolean;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    closeLead,
    {},
  );

  if (alreadyClosed) return null;

  return (
    <form action={formAction} className="rounded-md border p-4">
      <h2 className="text-sm font-semibold">ปิดเคส</h2>
      <p className="text-muted-foreground mt-1 mb-3 text-xs">
        ปิดแล้วจะไม่โผล่ในคิวโทรอีก แต่ประวัติยังอยู่ครบ
      </p>
      <input type="hidden" name="personId" value={personId} />
      <div className="flex flex-col gap-2">
        {CLOSE_REASONS.map((reason) => (
          <Button
            key={reason}
            type="submit"
            name="reason"
            value={reason}
            variant="outline"
            size="sm"
            disabled={pending}
            data-testid={`close-${reason}`}
          >
            {reason}
          </Button>
        ))}
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
