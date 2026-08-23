import assert from "node:assert/strict";
import test from "node:test";

const { buildCustomerVerificationEmail } = await import(
  "../lib/email/customerVerification.ts"
);

test("builds a minimal six-digit customer verification email", () => {
  const message = buildCustomerVerificationEmail("482915");

  assert.equal(message.subject, "Your Shoe Doctor verification code");
  assert.match(message.text, /Your Shoe Doctor verification code is 482915\./);
  assert.match(message.text, /This code expires in 10 minutes\./);
  assert.match(message.text, /If you did not request this, you can safely ignore this email\./);
  assert.match(message.html, />482915<\/p>/);
  assert.doesNotMatch(message.text, /@/);
  assert.doesNotMatch(message.html, /phone|address|booking/i);
});

test("rejects verification code values outside the six-digit contract", () => {
  assert.throws(
    () => buildCustomerVerificationEmail("<script>alert(1)</script>"),
    /six digits/i,
  );
});
