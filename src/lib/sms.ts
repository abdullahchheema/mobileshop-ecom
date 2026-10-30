import "server-only";

/**
 * Sends an SMS. No Pakistani SMS gateway is wired up yet, so in development the
 * message is printed to the server console; in production this fails loudly
 * rather than silently dropping OTPs.
 */
export async function sendSms(to: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[sms] to ${to}: ${message}`);
    return;
  }
  throw new Error("SMS provider is not configured");
}
