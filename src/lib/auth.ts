import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { bearer, phoneNumber } from "better-auth/plugins";
import { CART_COOKIE, mergeGuestCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { isPkMobile } from "@/lib/phone";
import { sendSms } from "@/lib/sms";

export const auth = betterAuth({
  appName: "Trendz Mobile",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: ["BUYER", "SELLER", "ADMIN"],
        required: false,
        defaultValue: "BUYER",
        // Never let a client choose its own role at sign-up.
        input: false,
      },
    },
  },
  hooks: {
    // Whenever a sign-in/sign-up creates a session, keep what the shopper put in
    // their cart while signed out.
    after: createAuthMiddleware(async (ctx) => {
      const userId = ctx.context.newSession?.user.id;
      const guestToken = ctx.getCookie(CART_COOKIE);
      if (!userId || !guestToken) return;
      await mergeGuestCart(guestToken, userId);
      ctx.setCookie(CART_COOKIE, "", { path: "/", maxAge: 0 });
    }),
  },
  plugins: [
    phoneNumber({
      phoneNumberValidator: isPkMobile,
      sendOTP: async ({ phoneNumber, code }) => {
        await sendSms(phoneNumber, `Your Trendz Mobile code is ${code}. It expires in 5 minutes.`);
      },
      // First OTP sign-in creates the account. Better Auth needs an email, so we
      // use a placeholder on the reserved .invalid TLD until the user adds one.
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace("+", "")}@phone.trendz.invalid`,
        getTempName: (phone) => phone,
      },
    }),
    // Lets the future mobile app authenticate with `Authorization: Bearer <token>`.
    bearer(),
    // Must stay last: makes cookies set inside Server Actions reach the browser.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
