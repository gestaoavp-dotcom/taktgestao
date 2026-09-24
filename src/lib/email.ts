import "server-only";
import nodemailer from "nodemailer";

// Sends through whatever SMTP account the deploy is given (Gmail with an app
// password, Brevo, the domain's own mail...). Supabase's built-in mailer only
// delivers to the project's own team, so it cannot reach a client.
//
// Vercel → Settings → Environment Variables:
//   SMTP_HOST, SMTP_PORT (587, or 465 for SSL), SMTP_USER, SMTP_PASS,
//   SMTP_FROM (optional, e.g. "TAKT Assessoria <contato@...>")

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    ...message,
  });
}
