"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PaymentError, startOnlinePayment } from "@/lib/payments/service";
import { completeTestPayment, testGatewayEnabled } from "@/lib/payments/test-gateway";
import { PaymentGatewayError } from "@/lib/payments/types";
import { getSession } from "@/lib/session";

/** Sends the buyer to the gateway again for an unpaid card order. */
export async function payOrderAction(orderId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Please sign in again." };
  let url: string;
  try {
    url = await startOnlinePayment(session.user.id, z.string().parse(orderId));
  } catch (e) {
    if (e instanceof PaymentError || e instanceof PaymentGatewayError) {
      if (e instanceof PaymentGatewayError) console.error("[payments] could not start payment", e);
      return { ok: false as const, error: e instanceof PaymentError ? e.message : "The payment page couldn't be opened. Please try again." };
    }
    throw e;
  }
  redirect(url);
}

/** The local test gateway's Pay / Decline buttons. Development only. */
export async function testGatewayAction(data: FormData) {
  if (!testGatewayEnabled()) throw new Error("Test gateway disabled.");
  const ref = z.string().startsWith("test_").parse(data.get("ref"));
  const outcome = z.enum(["paid", "failed"]).parse(data.get("outcome"));
  redirect(await completeTestPayment(ref, outcome));
}
