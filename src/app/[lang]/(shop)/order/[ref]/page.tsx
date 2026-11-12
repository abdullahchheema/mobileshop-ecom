import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracker } from "@/components/orders/order-tracker";

export async function generateMetadata({ params }: PageProps<"/[lang]/order/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  return { title: ref, robots: { index: false, follow: false } };
}

export default function OrderPage(props: PageProps<"/[lang]/order/[ref]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-secondary" />}>
        <Order {...props} />
      </Suspense>
    </div>
  );
}

async function Order({ params, searchParams }: PageProps<"/[lang]/order/[ref]">) {
  const [{ ref }, query] = await Promise.all([params, searchParams]);
  return <OrderTracker refNo={decodeURIComponent(ref)} justPlaced={query.placed === "1"} />;
}
