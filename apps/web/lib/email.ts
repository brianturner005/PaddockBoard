import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const link = `${appUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your PaddockBoard sign-in link",
    html: `<p>Click below to sign in to PaddockBoard. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p>`,
  });

  if (error) {
    throw new Error(`Failed to send magic-link email: ${error.message}`);
  }
}

export async function sendDriverClaimEmail(email: string, token: string, driverName: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const link = `${appUrl}/api/auth/claim-callback?token=${encodeURIComponent(token)}`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `Confirm you're ${driverName} on PaddockBoard`,
    html: `<p>Click below to claim the "${driverName}" driver profile and sign in to PaddockBoard. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send driver-claim email: ${error.message}`);
  }
}
