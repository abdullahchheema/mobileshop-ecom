import { describe, expect, it } from "vitest";
import {
  canRequestReturn,
  earningAfterRefunds,
  nextReturnStatus,
  payoutStatus,
  RETURN_WINDOW_DAYS,
  returnActions,
} from "./returns";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-30T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * day);

describe("return transitions", () => {
  it("goes requested → approved → received → refunded", () => {
    expect(nextReturnStatus("REQUESTED", "approve")).toBe("APPROVED");
    expect(nextReturnStatus("APPROVED", "receive")).toBe("RECEIVED");
    expect(nextReturnStatus("RECEIVED", "refund")).toBe("REFUNDED");
  });
  it("can't refund before the device is back, or act on finished returns", () => {
    expect(nextReturnStatus("APPROVED", "refund")).toBeNull();
    expect(returnActions("REFUNDED")).toEqual([]);
    expect(returnActions("REJECTED")).toEqual([]);
  });
});

describe("canRequestReturn", () => {
  it("is open for the return window after delivery", () => {
    expect(canRequestReturn(daysAgo(RETURN_WINDOW_DAYS - 1), now)).toBe(true);
    expect(canRequestReturn(daysAgo(RETURN_WINDOW_DAYS + 1), now)).toBe(false);
    expect(canRequestReturn(null, now)).toBe(false);
  });
});

describe("earningAfterRefunds", () => {
  const shipment = { subtotal: 100000, shippingFee: 250, commission: 10000 };
  it("is the normal earning without refunds", () => {
    expect(earningAfterRefunds(shipment, 0)).toBe(90250);
  });
  it("removes refunded items and gives back their share of commission", () => {
    // Refund half the items: seller loses 50,000 but gets 5,000 commission back.
    expect(earningAfterRefunds(shipment, 50000)).toBe(45250);
  });
  it("never goes negative", () => {
    expect(earningAfterRefunds({ subtotal: 100, shippingFee: 0, commission: 0 }, 1000)).toBe(0);
  });
});

describe("payoutStatus", () => {
  const delivered = (days: number) => ({ status: "DELIVERED", deliveredAt: daysAgo(days), payoutId: null });
  it("holds earnings during the return window", () => {
    expect(payoutStatus(delivered(3), [], now)).toBe("on_hold");
  });
  it("releases them after the window", () => {
    expect(payoutStatus(delivered(RETURN_WINDOW_DAYS + 1), [], now)).toBe("eligible");
  });
  it("keeps holding while a return is open, even after the window", () => {
    expect(payoutStatus(delivered(30), ["REQUESTED"], now)).toBe("on_hold");
    expect(payoutStatus(delivered(30), ["REFUNDED", "REJECTED"], now)).toBe("eligible");
  });
  it("reports paid and undelivered shipments", () => {
    expect(payoutStatus({ ...delivered(30), payoutId: "p1" }, [], now)).toBe("paid");
    expect(payoutStatus({ status: "SHIPPED", deliveredAt: null, payoutId: null }, [], now)).toBe("not_delivered");
  });
});
