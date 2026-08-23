import assert from "node:assert/strict";
import test from "node:test";

const {
  CUSTOMER_SESSION_COOKIE,
  clearCustomerSessionCookie,
  customerSessionCookie,
  normalizeCustomerPhone,
} = await import("../lib/customer-security.ts");

test("normalizes common Nepal mobile forms without rewriting unknown international input", () => {
  assert.equal(normalizeCustomerPhone("9841234567"), "+9779841234567");
  assert.equal(normalizeCustomerPhone("+977 984-123-4567"), "+9779841234567");
  assert.equal(normalizeCustomerPhone("9779841234567"), "+9779841234567");
  assert.equal(normalizeCustomerPhone("+1 (415) 555-0123"), "+14155550123");
  assert.equal(normalizeCustomerPhone("123"), null);
});

test("uses a host-only opaque customer-session cookie", () => {
  const cookie = customerSessionCookie("opaque-session-token");
  assert.match(cookie, new RegExp(`^${CUSTOMER_SESSION_COOKIE}=opaque-session-token;`));
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Max-Age=7776000$/);
  assert.doesNotMatch(cookie, /Domain=/i);

  const cleared = clearCustomerSessionCookie();
  assert.match(cleared, new RegExp(`^${CUSTOMER_SESSION_COOKIE}=;`));
  assert.match(cleared, /Max-Age=0$/);
});
