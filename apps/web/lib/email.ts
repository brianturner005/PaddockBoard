import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function sendSignupConfirmEmail(email: string, token: string): Promise<void> {
  const appUrl = getAppUrl();
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const link = `${appUrl}/api/auth/confirm-signup?token=${encodeURIComponent(token)}`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Confirm your PaddockBoard account",
    html: `<p>Click below to confirm this email and finish creating your PaddockBoard account. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email — no account will be created unless you click the link.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send signup-confirm email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = getAppUrl();
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your PaddockBoard password",
    html: `<p>Click below to set a new password. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email — your password won't change unless you click the link and set a new one.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send password-reset email: ${error.message}`);
  }
}

export async function sendDriverClaimEmail(email: string, token: string, driverName: string): Promise<void> {
  const appUrl = getAppUrl();
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

export async function sendSubscriptionConfirmEmail(
  email: string,
  subscriptionId: string,
  label: string
): Promise<void> {
  const appUrl = getAppUrl();
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const link = `${appUrl}/api/subscriptions/${subscriptionId}/confirm`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `Confirm your PaddockBoard alerts for ${label}`,
    html: `<p>Click below to confirm you'd like an email whenever new results are published for ${label}.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email — you won't be subscribed unless you click the link.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send subscription-confirm email: ${error.message}`);
  }
}

export async function sendResultsNotificationEmail(
  email: string,
  subscriptionId: string,
  info: { sessionName: string; eventName: string; clubName: string; publicSlug: string }
): Promise<void> {
  const appUrl = getAppUrl();
  const from = process.env.EMAIL_FROM ?? "PaddockBoard <onboarding@resend.dev>";
  const resultsLink = `${appUrl}/r/${info.publicSlug}`;
  const unsubscribeLink = `${appUrl}/api/subscriptions/${subscriptionId}/unsubscribe`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `New results: ${info.sessionName} — ${info.clubName}`,
    html: `<p>${info.eventName} (${info.sessionName}) results are up at ${info.clubName}.</p><p><a href="${resultsLink}">${resultsLink}</a></p><p style="color:#888;font-size:12px;margin-top:24px;"><a href="${unsubscribeLink}">Unsubscribe from these alerts</a></p>`,
  });

  if (error) {
    throw new Error(`Failed to send results-notification email: ${error.message}`);
  }
}
