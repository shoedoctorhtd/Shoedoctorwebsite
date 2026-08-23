export type CustomerVerificationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

const VERIFICATION_CODE_PATTERN = /^\d{6}$/u;

/**
 * Builds a deliberately minimal recovery message. The caller supplies only a
 * server-generated six-digit code; no customer profile details are included.
 */
export function buildCustomerVerificationEmail(
  verificationCode: string,
): CustomerVerificationEmailContent {
  const code = verificationCode.trim();
  if (!VERIFICATION_CODE_PATTERN.test(code)) {
    throw new Error("Verification code must contain six digits.");
  }

  const escapedCode = escapeHtml(code);
  return {
    subject: "Your Shoe Doctor verification code",
    text: [
      `Your Shoe Doctor verification code is ${code}.`,
      "",
      "This code expires in 10 minutes.",
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5f2;color:#151515;font-family:Arial,sans-serif;">
    <main style="box-sizing:border-box;margin:0 auto;max-width:600px;padding:28px 16px;">
      <section style="background:#ffffff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden;">
        <div style="background:#7b1738;color:#ffffff;padding:24px 28px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 8px;text-transform:uppercase;">Shoe Doctor</p>
          <h1 style="font-size:24px;line-height:1.25;margin:0;">Your verification code</h1>
        </div>
        <div style="padding:26px 28px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Your Shoe Doctor verification code is</p>
          <p style="color:#7b1738;font-size:30px;font-weight:700;letter-spacing:.16em;line-height:1.2;margin:0 0 20px;">${escapedCode}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">This code expires in 10 minutes.</p>
          <p style="color:#5e5a55;font-size:14px;line-height:1.6;margin:0;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </section>
    </main>
  </body>
</html>`,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
