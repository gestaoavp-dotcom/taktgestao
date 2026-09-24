import "server-only";
import nodemailer from "nodemailer";

// Sends through the SMTP account the deploy is given. Supabase's built-in
// mailer only delivers to the project's own team, so it cannot reach a client.
//
// Set in Vercel → Settings → Environment Variables, then redeploy:
//   SMTP_USER  the sending address (a Gmail, by default)
//   SMTP_PASS  its password — for Gmail, an app password, never the real one
// Only for a provider other than Gmail:
//   SMTP_HOST, SMTP_PORT (465 SSL / 587 STARTTLS), SMTP_FROM
//
// Changing the sender later is changing these values; nothing in the code
// names an address.

export function emailSender() {
  return process.env.SMTP_USER && process.env.SMTP_PASS ? process.env.SMTP_USER : null;
}

export function emailConfigured() {
  return emailSender() !== null;
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `TAKT Assessoria <${process.env.SMTP_USER}>`,
    ...message,
  });
}
