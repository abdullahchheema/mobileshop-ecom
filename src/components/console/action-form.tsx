"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * A form posting to a Server Action that returns ActionResult. Shows a toast,
 * keeps the input on errors and (optionally) clears it on success.
 * Children can read the pending state from `fieldset:disabled`.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: (data: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Asks before submitting, for destructive actions. */
  confirm?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      // If someone submits before hydration, the browser falls back to a native
      // submit: POST keeps the fields (IBANs, notes…) out of the URL and history.
      method="post"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const form = e.currentTarget;
        const data = new FormData(form);
        start(async () => {
          const result = await action(data);
          // Actions that redirect on success never hand a result back.
          if (!result) return;
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          if (result.message) toast.success(result.message);
          if (resetOnSuccess) form.reset();
        });
      }}
    >
      <fieldset disabled={pending} className={cn("contents", pending && "[&>*]:opacity-60")}>
        {children}
      </fieldset>
    </form>
  );
}
