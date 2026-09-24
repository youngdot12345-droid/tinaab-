import { Resend } from "resend";

function getResendClient() {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return String(process.env.EMAIL_FROM || "Tinaab <noreply@tinaab.name.ng>").trim();
}

export async function sendVerificationEmail({ to, firstName, code }) {
  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Tinaab development email code] ${to}: ${code}`);
      return { ok: true, development: true };
    }
    return { ok: false, reason: "Email delivery is not configured." };
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject: "Verify your Tinaab email",
    text: `Hello ${firstName || "there"}, your Tinaab verification code is ${code}. It expires in 10 minutes. If you did not create this account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Verify your Tinaab email</h2><p>Hello ${firstName || "there"},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not create this account, you can ignore this email.</p></div>`
  });

  if (error) return { ok: false, reason: "Unable to send the verification email." };
  return { ok: true };
}
