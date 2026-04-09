import twilio from "twilio";

export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER || "";
  const client = twilio(accountSid, authToken);
  await client.messages.create({ to, from: fromNumber, body });
}
