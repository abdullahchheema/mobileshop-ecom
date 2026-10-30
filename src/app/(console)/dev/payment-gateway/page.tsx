import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FlaskConicalIcon, LockIcon } from "lucide-react";
import { testGatewayAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { formatOrderNumber } from "@/lib/order-number";
import { getTestSession, testGatewayEnabled } from "@/lib/payments/test-gateway";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Test payment gateway", robots: { index: false } };

/** Stand-in for Safepay's hosted checkout page during local development. */
export default function TestGatewayPage(props: PageProps<"/dev/payment-gateway">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-secondary px-4 py-16">
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-3xl bg-background" />}>
        <Gateway {...props} />
      </Suspense>
    </main>
  );
}

async function Gateway({ searchParams }: PageProps<"/dev/payment-gateway">) {
  await connection();
  if (!testGatewayEnabled()) notFound();
  const { ref } = await searchParams;
  const session = typeof ref === "string" ? await getTestSession(ref) : null;
  if (!session) notFound();

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl border bg-background p-8 shadow-xl">
      <p className="flex items-center gap-2 rounded-lg bg-mango/50 px-3 py-2 text-sm font-medium">
        <FlaskConicalIcon className="size-4" /> Test gateway: no real money moves.
      </p>
      <div>
        <p className="text-sm text-muted-foreground">Trendz Mobile · order {formatOrderNumber(session.orderNumber)}</p>
        <p className="mt-1 text-4xl font-semibold">{formatPkr(session.amount)}</p>
      </div>
      {session.state === "pending" ? (
        <form action={testGatewayAction} className="space-y-3">
          <input type="hidden" name="ref" value={ref} />
          <Button type="submit" name="outcome" value="paid" size="lg" className="h-12 w-full">
            <LockIcon data-icon="inline-start" /> Pay {formatPkr(session.amount)}
          </Button>
          <Button type="submit" name="outcome" value="failed" variant="outline" size="lg" className="h-12 w-full">
            Simulate a declined card
          </Button>
        </form>
      ) : (
        <p className="text-sm">This test payment is already {session.state}.</p>
      )}
      <a href={session.cancelUrl} className="block text-center text-sm text-muted-foreground underline">
        Cancel and return to Trendz
      </a>
    </div>
  );
}
