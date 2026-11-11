const isConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && (process.env.APP_URL || process.env.FRONTEND_URL));

async function sendAccountEmail({ to, subject, heading, message, actionLabel, actionPath, token }) {
  if (!isConfigured()) {
    const error = new Error("Account email delivery is not configured");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }
  const actionUrl = new URL(actionPath, process.env.APP_URL || process.env.FRONTEND_URL);
  actionUrl.searchParams.set("token", token);
  const safeHeading = String(heading).replace(/[<>&"]/g, "");
  const safeMessage = String(message).replace(/[<>&"]/g, "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html: '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>' + safeHeading + '</h2><p>' + safeMessage + '</p><p><a href="' + actionUrl.toString() + '">' + actionLabel + '</a></p><p>اگر این درخواست از طرف شما نبوده، این پیام را نادیده بگیرید.</p></div>',
    }),
  });
  if (!response.ok) throw new Error("Account email provider returned HTTP " + response.status);
}

export const isAccountEmailConfigured = isConfigured;
export const sendVerificationEmail = (email, token) => sendAccountEmail({
  to: email, subject: "تأیید ایمیل حساب کاربری", heading: "تأیید نشانی ایمیل",
  message: "برای تأیید ایمیل خود روی پیوند زیر بزنید. این پیوند تا ۳۰ دقیقه معتبر است.",
  actionLabel: "تأیید ایمیل", actionPath: "/verify-email", token,
});
export const sendEmailChangeConfirmation = (email, token) => sendAccountEmail({
  to: email, subject: "تأیید تغییر ایمیل حساب", heading: "تأیید ایمیل جدید",
  message: "درخواست تغییر ایمیل ثبت شده است. برای تأیید نشانی جدید از پیوند زیر استفاده کنید.",
  actionLabel: "تأیید ایمیل جدید", actionPath: "/confirm-email-change", token,
});
