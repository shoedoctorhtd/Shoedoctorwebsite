import { isPickupArea, type PickupArea } from "./booking-pricing";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_DURATION_SECONDS,
  normalizeCustomerPhone,
} from "./customer-security";
import { ensureDatabase, getDatabase } from "./data";
import { isEmailAddress } from "./email/address";
import { buildCustomerVerificationEmail } from "./email/customerVerification";
import { sendGmailEmail } from "./email/gmail";
import { getRequestExecutionContext } from "vinext/shims/request-context";

export {
  clearCustomerSessionCookie,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_DURATION_SECONDS,
  customerSessionCookie,
  normalizeCustomerPhone,
} from "./customer-security";

export const CUSTOMER_VERIFICATION_CODE_DURATION_SECONDS = 60 * 10;
export const CUSTOMER_VERIFICATION_MAX_ATTEMPTS = 5;
export const CUSTOMER_RECOVERY_MESSAGE =
  "If we found a matching saved profile, a verification code has been sent to the registered email. If we couldn't verify it right now, you can still continue with a normal booking.";

const CUSTOMER_RECOVERY_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const CUSTOMER_RECOVERY_REQUESTS_PER_PHONE = 3;
const CUSTOMER_RECOVERY_REQUESTS_PER_IP = 10;
const CUSTOMER_RECOVERY_ATTEMPTS_PER_PHONE = 12;
const CUSTOMER_RECOVERY_ATTEMPTS_PER_IP = 30;
const CUSTOMER_RECOVERY_RESPONSE_MIN_MS = 350;
const CUSTOMER_RECOVERY_RESPONSE_MAX_MS = 650;
const CUSTOMER_SESSION_LAST_USED_UPDATE_MS = 24 * 60 * 60 * 1000;

export type ReturningCustomerProfile = {
  name: string;
  phone: string;
  email: string | null;
  defaultAddress: string | null;
  defaultPickupArea: PickupArea | null;
};

type CustomerRecord = ReturningCustomerProfile & {
  id: string;
  phoneNormalized: string;
  emailNormalized: string | null;
  recoveryEmail: string | null;
  recoveryEmailEnabledAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSessionLookup = {
  customer: ReturningCustomerProfile | null;
  customerId: string | null;
  sessionId: string | null;
  shouldClearCookie: boolean;
};

export type CustomerBookingPreferences = {
  rememberDetails: boolean;
  saveCustomerDetails: boolean;
  /**
   * The browser only sets this after it has shown and accepted the saved
   * profile. It prevents a stale shared-device cookie from being attached to
   * a booking typed before the asynchronous session lookup finishes.
   */
  useCustomerSession: boolean;
  /** A safe, client-controlled opt-out of cookie-based association. */
  useDifferentDetails: boolean;
};

export type CustomerBookingAssociationInput = {
  bookingId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  pickupAddress?: string | null;
  pickupArea?: PickupArea | null;
  preferences: CustomerBookingPreferences;
  authenticatedCustomerId?: string | null;
};

export type CustomerBookingAssociation = {
  customer: ReturningCustomerProfile | null;
  customerId: string | null;
  sessionToken: string | null;
};

type CustomerRuntimeEnvironment = {
  CUSTOMER_SESSION_SECRET?: string;
  SESSION_SECRET?: string;
};

type RateLimitScope =
  | "customer_recovery_request_ip"
  | "customer_recovery_request_phone"
  | "customer_recovery_verify_ip"
  | "customer_recovery_verify_phone";

type VerificationCodeRecord = {
  id: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: string;
};

type Database = Awaited<ReturnType<typeof getDatabase>>;

/**
 * Consent flags are intentionally parsed separately from public booking
 * fields. A browser is never allowed to nominate a customer ID.
 */
export function parseCustomerBookingPreferences(
  value: unknown,
): CustomerBookingPreferences {
  const input = asRecord(value);
  if (Object.prototype.hasOwnProperty.call(input, "customerId")) {
    throw new Error("Customer selection is handled securely by Shoe Doctor.");
  }

  return {
    rememberDetails: readOptionalBoolean(input.rememberDetails, "Remember details"),
    saveCustomerDetails: readOptionalBoolean(
      input.saveCustomerDetails,
      "Save customer details",
    ),
    useCustomerSession: readOptionalBoolean(
      input.useCustomerSession,
      "Use saved customer details",
    ),
    useDifferentDetails: readOptionalBoolean(
      input.useDifferentDetails,
      "Use different details",
    ),
  };
}

export async function getCustomerSession(
  request: Request,
): Promise<CustomerSessionLookup> {
  const token = readRequestCookie(request, CUSTOMER_SESSION_COOKIE);
  if (!token) {
    return {
      customer: null,
      customerId: null,
      sessionId: null,
      shouldClearCookie: false,
    };
  }
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(token)) {
    return {
      customer: null,
      customerId: null,
      sessionId: null,
      shouldClearCookie: true,
    };
  }

  await ensureDatabase();
  const db = await getDatabase();
  const now = new Date().toISOString();
  const tokenHash = await hashValue(`customer-session:${token}`);
  const row = await db
    .prepare(`
      SELECT
        customer_sessions.id AS session_id,
        customers.id AS customer_id,
        customers.name AS customer_name,
        customers.phone AS customer_phone,
        customers.phone_normalized AS customer_phone_normalized,
        customers.email AS customer_email,
        customers.email_normalized AS customer_email_normalized,
        customers.default_address AS customer_default_address,
        customers.default_pickup_area AS customer_default_pickup_area,
        customers.recovery_email AS customer_recovery_email,
        customers.recovery_email_enabled_at AS customer_recovery_email_enabled_at,
        customers.email_verified_at AS customer_email_verified_at,
        customers.created_at AS customer_created_at,
        customers.updated_at AS customer_updated_at
      FROM customer_sessions
      INNER JOIN customers ON customers.id = customer_sessions.customer_id
      WHERE customer_sessions.token_hash = ?
        AND customer_sessions.revoked_at IS NULL
        AND customer_sessions.expires_at > ?
      LIMIT 1
    `)
    .bind(tokenHash, now)
    .first<Record<string, unknown>>();

  if (!row) {
    return {
      customer: null,
      customerId: null,
      sessionId: null,
      shouldClearCookie: true,
    };
  }

  const customer = parsePrefixedCustomer(row, "customer_");
  const sessionId = String(row.session_id ?? "");
  if (!customer || !sessionId) {
    return {
      customer: null,
      customerId: null,
      sessionId: null,
      shouldClearCookie: true,
    };
  }

  const lastUsedBefore = new Date(
    Date.now() - CUSTOMER_SESSION_LAST_USED_UPDATE_MS,
  ).toISOString();
  await db
    .prepare(`
      UPDATE customer_sessions
      SET last_used_at = ?
      WHERE id = ?
        AND revoked_at IS NULL
        AND expires_at > ?
        AND (last_used_at IS NULL OR last_used_at < ?)
    `)
    .bind(now, sessionId, now, lastUsedBefore)
    .run();

  return {
    customer: toReturningProfile(customer),
    customerId: customer.id,
    sessionId,
    shouldClearCookie: false,
  };
}

export async function revokeCustomerSession(request: Request) {
  const token = readRequestCookie(request, CUSTOMER_SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{32,128}$/u.test(token)) return;

  await ensureDatabase();
  const db = await getDatabase();
  const tokenHash = await hashValue(`customer-session:${token}`);
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE customer_sessions
      SET revoked_at = COALESCE(revoked_at, ?), last_used_at = ?
      WHERE token_hash = ?
    `)
    .bind(now, now, tokenHash)
    .run();
}

/**
 * Associates a saved booking with a profile after the booking has persisted.
 * This intentionally never changes the booking's historical contact snapshot.
 */
export async function associateBookingWithCustomer(
  input: CustomerBookingAssociationInput,
): Promise<CustomerBookingAssociation> {
  const authenticatedCustomerId =
    input.preferences.useDifferentDetails || !input.preferences.useCustomerSession
      ? null
      : input.authenticatedCustomerId?.trim() || null;
  // A reusable profile is an explicit convenience feature. A normal booking
  // remains a normal booking unless the customer has opted in or supplied a
  // session that the page explicitly accepted.
  if (!authenticatedCustomerId && !input.preferences.rememberDetails) {
    return emptyCustomerBookingAssociation();
  }

  const phoneNormalized = normalizeCustomerPhone(input.phone);
  if (!phoneNormalized) {
    throw new Error("Customer profile phone number is invalid.");
  }

  await ensureDatabase();
  const db = await getDatabase();
  const now = new Date().toISOString();
  const email = cleanNullableText(input.email, 120);
  const emailNormalized = normalizeCustomerEmail(email);
  const address = cleanNullableText(input.pickupAddress, 300);
  const pickupAreaValue = String(input.pickupArea ?? "");
  const pickupArea = isPickupArea(pickupAreaValue)
    ? pickupAreaValue
    : null;
  const details = {
    name: cleanRequiredText(input.customerName, 80),
    phone: cleanRequiredText(input.phone, 30),
    phoneNormalized,
    email,
    emailNormalized,
    defaultAddress: address,
    defaultPickupArea: pickupArea,
  };

  let customer: CustomerRecord | null = null;
  let createdProfile = false;
  if (authenticatedCustomerId) {
    customer = await findCustomerById(db, authenticatedCustomerId);
    if (!customer) {
      throw new Error("Saved customer profile is unavailable.");
    }
    if (input.preferences.saveCustomerDetails) {
      customer = await updateCustomerProfile(db, customer, details, { now });
    }
  } else {
    customer = await findCustomerByIdentity(db, phoneNormalized, emailNormalized);
    if (customer) {
      // Exact contact fields are not authentication. Do not attach a booking,
      // update the profile, or mint a session until the owner proves control
      // through an existing device session or email-code recovery.
      return emptyCustomerBookingAssociation();
    }

    const created = await createCustomerProfile(db, details, {
      enableRecovery: Boolean(email),
      now,
    });
    customer = created.customer;
    createdProfile = created.created;
    if (!createdProfile) return emptyCustomerBookingAssociation();
  }

  if (!customer) return emptyCustomerBookingAssociation();

  const linked = await db
    .prepare("UPDATE bookings SET customer_id = ? WHERE id = ?")
    .bind(customer.id, input.bookingId)
    .run();
  if (!linked.meta.changes) {
    throw new Error("Saved booking could not be linked to the customer profile.");
  }

  const sessionToken =
    input.preferences.rememberDetails && !authenticatedCustomerId && createdProfile
      ? await createCustomerSession(customer.id)
      : null;

  return {
    customer: toReturningProfile(customer),
    customerId: customer.id,
    sessionToken,
  };
}

/**
 * Sends a generic recovery response in every case. A matching profile must
 * have a uniquely matched registered email, but neither condition is
 * observable by the browser. Successful code entry proves email control and
 * enables future recovery for that profile.
 */
export async function requestCustomerRecovery(input: {
  phone: unknown;
  request: Request;
}) {
  const responseStartedAt = Date.now();
  const responseFloorMs = createRecoveryResponseFloor();
  try {
    const phoneNormalized = normalizeCustomerPhone(input.phone);
    if (!phoneNormalized) return { message: CUSTOMER_RECOVERY_MESSAGE };

    await ensureDatabase();
    const db = await getDatabase();
    const ip = clientAddress(input.request);
    const [phoneAllowed, ipAllowed] = await Promise.all([
      consumeRateLimit(
        db,
        "customer_recovery_request_phone",
        phoneNormalized,
        CUSTOMER_RECOVERY_REQUESTS_PER_PHONE,
      ),
      consumeRateLimit(
        db,
        "customer_recovery_request_ip",
        ip,
        CUSTOMER_RECOVERY_REQUESTS_PER_IP,
      ),
    ]);
    if (!phoneAllowed || !ipAllowed) {
      return { message: CUSTOMER_RECOVERY_MESSAGE };
    }

    const matches = await db
      .prepare(`
        SELECT * FROM customers
        WHERE phone_normalized = ?
          AND recovery_email_enabled_at IS NOT NULL
          AND recovery_email IS NOT NULL
          AND recovery_email <> ''
        ORDER BY updated_at DESC
        LIMIT 2
      `)
      .bind(phoneNormalized)
      .all<Record<string, unknown>>();
    if (matches.results.length !== 1) {
      return { message: CUSTOMER_RECOVERY_MESSAGE };
    }

    const customer = parseCustomer(matches.results[0]);
    if (
      !customer ||
      !customer.recoveryEmail ||
      !isEmailAddress(customer.recoveryEmail)
    ) {
      return { message: CUSTOMER_RECOVERY_MESSAGE };
    }

    const secret = await getCustomerSecuritySecret();
    if (!secret) {
      console.error(
        "Customer recovery is unavailable because its server secret is not configured.",
      );
      return { message: CUSTOMER_RECOVERY_MESSAGE };
    }

    const code = createVerificationCode();
    const codeHash = await hashVerificationCode(customer.id, code, secret);
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + CUSTOMER_VERIFICATION_CODE_DURATION_SECONDS * 1000,
    ).toISOString();
    const codeId = crypto.randomUUID();

    // State changes happen before the public response. The email work itself
    // is detached on Workers so OAuth/send latency cannot reveal whether a
    // supplied phone had an eligible profile.
    await db.batch([
      db
        .prepare(`
          UPDATE customer_verification_codes
          SET consumed_at = ?
          WHERE customer_id = ? AND consumed_at IS NULL
        `)
        .bind(createdAt, customer.id),
      db
        .prepare(`
          INSERT INTO customer_verification_codes (
            id, customer_id, code_hash, created_at, expires_at, attempt_count, consumed_at
          ) VALUES (?, ?, ?, ?, ?, 0, NULL)
        `)
        .bind(codeId, customer.id, codeHash, createdAt, expiresAt),
    ]);

    const content = buildCustomerVerificationEmail(code);
    const deliveryWork = deliverCustomerVerificationEmail({
      db,
      email: customer.recoveryEmail,
      content,
      codeId,
    });
    const context = getRequestExecutionContext();
    if (context) {
      context.waitUntil(deliveryWork);
    } else {
      // Local development has no Worker execution context. Awaiting here
      // makes delivery deterministic instead of letting the promise vanish.
      await deliveryWork;
    }

    return { message: CUSTOMER_RECOVERY_MESSAGE };
  } finally {
    await waitForRecoveryResponseFloor(responseStartedAt, responseFloorMs);
  }
}

async function deliverCustomerVerificationEmail(input: {
  codeId: string;
  content: ReturnType<typeof buildCustomerVerificationEmail>;
  db: Database;
  email: string;
}) {
  try {
    const delivery = await sendGmailEmail({
      to: input.email,
      subject: input.content.subject,
      text: input.content.text,
      html: input.content.html,
    });
    if (delivery.status === "sent") return;
  } catch {
    // The response stays generic and the code is invalidated below.
  }

  try {
    await input.db
      .prepare(
        "UPDATE customer_verification_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
      )
      .bind(new Date().toISOString(), input.codeId)
      .run();
  } catch {
    // Best effort only: no private values are included in the operational log.
  }
  console.error("Customer recovery email could not be sent.");
}

export async function verifyCustomerRecovery(input: {
  phone: unknown;
  code: unknown;
  request: Request;
}): Promise<
  | { ok: true; customer: ReturningCustomerProfile; sessionToken: string }
  | { ok: false; message: string }
> {
  const responseStartedAt = Date.now();
  const responseFloorMs = createRecoveryResponseFloor();
  try {
    const phoneNormalized = normalizeCustomerPhone(input.phone);
    const code = typeof input.code === "string" ? input.code.trim() : "";
    const invalidResult = {
      ok: false as const,
      message:
        "That verification code is invalid or has expired. You can continue with a normal booking.",
    };
    if (!phoneNormalized || !/^\d{6}$/u.test(code)) return invalidResult;

  await ensureDatabase();
  const db = await getDatabase();
  const ip = clientAddress(input.request);
  const [phoneAllowed, ipAllowed] = await Promise.all([
    consumeRateLimit(
      db,
      "customer_recovery_verify_phone",
      phoneNormalized,
      CUSTOMER_RECOVERY_ATTEMPTS_PER_PHONE,
    ),
    consumeRateLimit(
      db,
      "customer_recovery_verify_ip",
      ip,
      CUSTOMER_RECOVERY_ATTEMPTS_PER_IP,
    ),
  ]);
  if (!phoneAllowed || !ipAllowed) return invalidResult;

  const candidates = await db
    .prepare(`
      SELECT * FROM customers
      WHERE phone_normalized = ?
        AND recovery_email_enabled_at IS NOT NULL
        AND recovery_email IS NOT NULL
        AND recovery_email <> ''
      ORDER BY updated_at DESC
      LIMIT 2
    `)
    .bind(phoneNormalized)
    .all<Record<string, unknown>>();
  if (candidates.results.length !== 1) return invalidResult;

  const customer = parseCustomer(candidates.results[0]);
  const secret = await getCustomerSecuritySecret();
  if (!customer || !secret) return invalidResult;

  const now = new Date().toISOString();
  const codeRow = await db
    .prepare(`
      SELECT id, code_hash, attempt_count, expires_at
      FROM customer_verification_codes
      WHERE customer_id = ? AND consumed_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .bind(customer.id, now)
    .first<Record<string, unknown>>();
  const verificationCode = parseVerificationCode(codeRow);
  if (!verificationCode || verificationCode.attemptCount >= CUSTOMER_VERIFICATION_MAX_ATTEMPTS) {
    return invalidResult;
  }

  const expectedHash = await hashVerificationCode(customer.id, code, secret);
  const validCode = await constantTimeEqual(expectedHash, verificationCode.codeHash);
  if (!validCode) {
    const nextAttempt = verificationCode.attemptCount + 1;
    await db
      .prepare(`
        UPDATE customer_verification_codes
        SET attempt_count = ?, consumed_at = CASE WHEN ? >= ? THEN ? ELSE consumed_at END
        WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempt_count = ?
      `)
      .bind(
        nextAttempt,
        nextAttempt,
        CUSTOMER_VERIFICATION_MAX_ATTEMPTS,
        now,
        verificationCode.id,
        now,
        verificationCode.attemptCount,
      )
      .run();
    return invalidResult;
  }

  const consumed = await db
    .prepare(`
      UPDATE customer_verification_codes
      SET attempt_count = attempt_count + 1, consumed_at = ?
      WHERE id = ?
        AND consumed_at IS NULL
        AND expires_at > ?
        AND attempt_count = ?
    `)
    .bind(now, verificationCode.id, now, verificationCode.attemptCount)
    .run();
  if (!consumed.meta.changes) return invalidResult;

  await db
    .prepare(`
      UPDATE customers
      SET email_verified_at = COALESCE(email_verified_at, ?),
        recovery_email_enabled_at = COALESCE(recovery_email_enabled_at, ?),
        updated_at = ?
      WHERE id = ?
    `)
    .bind(now, now, now, customer.id)
    .run();
  const sessionToken = await createCustomerSession(customer.id);
    return {
      ok: true,
      customer: toReturningProfile(customer),
      sessionToken,
    };
  } finally {
    await waitForRecoveryResponseFloor(responseStartedAt, responseFloorMs);
  }
}

async function createCustomerSession(customerId: string) {
  await ensureDatabase();
  const db = await getDatabase();
  const token = createOpaqueToken();
  const tokenHash = await hashValue(`customer-session:${token}`);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + CUSTOMER_SESSION_DURATION_SECONDS * 1000,
  ).toISOString();
  await db
    .prepare(`
      INSERT INTO customer_sessions (
        id, customer_id, token_hash, created_at, expires_at, last_used_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `)
    .bind(
      crypto.randomUUID(),
      customerId,
      tokenHash,
      createdAt,
      expiresAt,
      createdAt,
    )
    .run();
  return token;
}

async function findCustomerById(db: Database, customerId: string) {
  const row = await db
    .prepare("SELECT * FROM customers WHERE id = ? LIMIT 1")
    .bind(customerId)
    .first<Record<string, unknown>>();
  return parseCustomer(row);
}

async function findCustomerByIdentity(
  db: Database,
  phoneNormalized: string,
  emailNormalized: string | null,
) {
  // Phone alone is deliberately not enough to identify a shared household or
  // business customer. Only a non-empty exact email is safe to reuse without
  // an authenticated session.
  if (!emailNormalized) return null;
  const row = await db
    .prepare(`
      SELECT * FROM customers
      WHERE phone_normalized = ? AND email_normalized = ?
      LIMIT 1
    `)
    .bind(phoneNormalized, emailNormalized)
    .first<Record<string, unknown>>();
  return parseCustomer(row);
}

async function createCustomerProfile(
  db: Database,
  details: CustomerDetails,
  options: { enableRecovery: boolean; now: string },
): Promise<{ customer: CustomerRecord; created: boolean }> {
  const id = crypto.randomUUID();
  const recoveryEmailEnabledAt = options.enableRecovery ? options.now : null;
  try {
    await db
      .prepare(`
        INSERT INTO customers (
          id, name, phone, phone_normalized, email, email_normalized,
          default_address, default_pickup_area, recovery_email,
          recovery_email_enabled_at, email_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `)
      .bind(
        id,
        details.name,
        details.phone,
        details.phoneNormalized,
        details.email,
        details.emailNormalized,
        details.defaultAddress,
        details.defaultPickupArea,
        options.enableRecovery ? details.email : null,
        recoveryEmailEnabledAt,
        options.now,
        options.now,
      )
      .run();
  } catch {
    const racedCustomer = await findCustomerByIdentity(
      db,
      details.phoneNormalized,
      details.emailNormalized,
    );
    if (racedCustomer) {
      return { customer: racedCustomer, created: false };
    }
    throw new Error("Unable to create customer profile.");
  }

  return {
    customer: {
      id,
      ...details,
      recoveryEmail: options.enableRecovery ? details.email : null,
      recoveryEmailEnabledAt,
      emailVerifiedAt: null,
      createdAt: options.now,
      updatedAt: options.now,
    },
    created: true,
  };
}

type CustomerDetails = {
  name: string;
  phone: string;
  phoneNormalized: string;
  email: string | null;
  emailNormalized: string | null;
  defaultAddress: string | null;
  defaultPickupArea: PickupArea | null;
};

async function updateCustomerProfile(
  db: Database,
  customer: CustomerRecord,
  details: CustomerDetails,
  options: { now: string },
) {
  const matchingIdentity = details.emailNormalized
    ? await db
        .prepare(`
          SELECT id FROM customers
          WHERE phone_normalized = ? AND email_normalized = ? AND id <> ?
          LIMIT 1
        `)
        .bind(details.phoneNormalized, details.emailNormalized, customer.id)
        .first<{ id: string }>()
    : null;
  if (matchingIdentity) return customer;

  // Updating the booking-contact email must never silently transfer the
  // recovery channel to a newly entered address. The original opted-in
  // recovery email remains in place until a dedicated, code-confirmed
  // recovery-email change flow is introduced.
  const recoveryEmailEnabledAt = customer.recoveryEmailEnabledAt;
  const emailVerifiedAt = customer.emailVerifiedAt;
  const defaultAddress = details.defaultAddress ?? customer.defaultAddress;
  const defaultPickupArea =
    details.defaultPickupArea ?? customer.defaultPickupArea;

  await db
    .prepare(`
      UPDATE customers
      SET name = ?, phone = ?, phone_normalized = ?, email = ?, email_normalized = ?,
        default_address = ?, default_pickup_area = ?, recovery_email_enabled_at = ?,
        email_verified_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(
      details.name,
      details.phone,
      details.phoneNormalized,
      details.email,
      details.emailNormalized,
      defaultAddress,
      defaultPickupArea,
      recoveryEmailEnabledAt,
      emailVerifiedAt,
      options.now,
      customer.id,
    )
    .run();

  return {
    ...customer,
    ...details,
    defaultAddress,
    defaultPickupArea,
    recoveryEmailEnabledAt,
    emailVerifiedAt,
    updatedAt: options.now,
  };
}

async function consumeRateLimit(
  db: Database,
  scope: RateLimitScope,
  identifier: string,
  maximum: number,
) {
  const keyHash = await hashValue(`customer-rate-limit:${scope}:${identifier}`);
  const now = new Date();
  const nowIso = now.toISOString();
  const windowCutoff = new Date(
    now.getTime() - CUSTOMER_RECOVERY_REQUEST_WINDOW_MS,
  ).toISOString();
  const consumed = await db
    .prepare(`
      INSERT INTO customer_rate_limits (
        id, key_hash, scope, window_started_at, count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(scope, key_hash) DO UPDATE SET
        window_started_at = CASE
          WHEN customer_rate_limits.window_started_at <= ? THEN excluded.window_started_at
          ELSE customer_rate_limits.window_started_at
        END,
        count = CASE
          WHEN customer_rate_limits.window_started_at <= ? THEN 1
          ELSE customer_rate_limits.count + 1
        END,
        updated_at = excluded.updated_at
      WHERE customer_rate_limits.window_started_at <= ?
        OR customer_rate_limits.count < ?
    `)
    .bind(
      crypto.randomUUID(),
      keyHash,
      scope,
      nowIso,
      nowIso,
      nowIso,
      windowCutoff,
      windowCutoff,
      windowCutoff,
      maximum,
    )
    .run();
  return Boolean(consumed.meta.changes);
}

function parseCustomer(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  const name = String(row.name ?? "").trim();
  const phone = String(row.phone ?? "").trim();
  const phoneNormalized = String(row.phone_normalized ?? "").trim();
  if (!id || !name || !phone || !phoneNormalized) return null;
  const defaultPickupArea = String(row.default_pickup_area ?? "");
  return {
    id,
    name,
    phone,
    phoneNormalized,
    email: cleanNullableText(row.email, 120),
    emailNormalized: cleanNullableText(row.email_normalized, 120),
    recoveryEmail: cleanNullableText(row.recovery_email, 120),
    defaultAddress: cleanNullableText(row.default_address, 300),
    defaultPickupArea: isPickupArea(defaultPickupArea)
      ? defaultPickupArea
      : null,
    recoveryEmailEnabledAt: cleanNullableText(
      row.recovery_email_enabled_at,
      40,
    ),
    emailVerifiedAt: cleanNullableText(row.email_verified_at, 40),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  } satisfies CustomerRecord;
}

function parsePrefixedCustomer(row: Record<string, unknown>, prefix: string) {
  const selected: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      selected[key.slice(prefix.length)] = value;
    }
  });
  return parseCustomer(selected);
}

function parseVerificationCode(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  const codeHash = String(row.code_hash ?? "").trim();
  const attemptCount = Number(row.attempt_count ?? 0);
  const expiresAt = String(row.expires_at ?? "").trim();
  if (
    !id ||
    !codeHash ||
    !expiresAt ||
    !Number.isInteger(attemptCount) ||
    attemptCount < 0
  ) {
    return null;
  }
  return { id, codeHash, attemptCount, expiresAt } satisfies VerificationCodeRecord;
}

function emptyCustomerBookingAssociation(): CustomerBookingAssociation {
  return { customer: null, customerId: null, sessionToken: null };
}

function toReturningProfile(customer: CustomerRecord): ReturningCustomerProfile {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    defaultAddress: customer.defaultAddress,
    defaultPickupArea: customer.defaultPickupArea,
  };
}

function normalizeCustomerEmail(value: string | null) {
  return value && isEmailAddress(value) ? value.trim().toLowerCase() : null;
}

function cleanRequiredText(value: unknown, maximum: number) {
  const text = cleanNullableText(value, maximum);
  if (!text) throw new Error("Customer profile details are incomplete.");
  return text;
}

function cleanNullableText(value: unknown, maximum: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maximum) : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOptionalBoolean(value: unknown, label: string) {
  if (value === undefined) return false;
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be selected with a valid option.`);
  }
  return value;
}

function readRequestCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pair = cookieHeader
    .split(/;\s*/u)
    .find((entry) => entry.startsWith(`${name}=`));
  if (!pair) return null;
  const rawValue = pair.slice(name.length + 1);
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function clientAddress(request: Request) {
  const cloudflareAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareAddress) return cloudflareAddress;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

function createOpaqueToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function createVerificationCode() {
  const range = 1_000_000;
  const maximum = Math.floor(0x1_0000_0000 / range) * range;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= maximum);
  return String(random[0] % range).padStart(6, "0");
}

function createRecoveryResponseFloor() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const range =
    CUSTOMER_RECOVERY_RESPONSE_MAX_MS - CUSTOMER_RECOVERY_RESPONSE_MIN_MS + 1;
  return CUSTOMER_RECOVERY_RESPONSE_MIN_MS + (random[0] % range);
}

async function waitForRecoveryResponseFloor(
  startedAt: number,
  responseFloorMs: number,
) {
  const remaining = responseFloorMs - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}

async function hashVerificationCode(
  customerId: string,
  code: string,
  secret: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`customer-verification:${customerId}:${code}`),
  );
  return base64UrlEncode(new Uint8Array(signed));
}

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

async function constantTimeEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function getCustomerSecuritySecret() {
  const environment = await getCustomerRuntimeEnvironment();
  const secret =
    environment.CUSTOMER_SESSION_SECRET?.trim() ||
    environment.SESSION_SECRET?.trim() ||
    "";
  return secret.length >= 32 ? secret : null;
}

async function getCustomerRuntimeEnvironment(): Promise<CustomerRuntimeEnvironment> {
  try {
    const workers = (await import("cloudflare:workers")) as {
      env?: CustomerRuntimeEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local development and focused tests can use environment variables.
  }

  const runtime = {
    CUSTOMER_SESSION_SECRET: process.env.CUSTOMER_SESSION_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
  if (runtime.CUSTOMER_SESSION_SECRET || runtime.SESSION_SECRET) return runtime;

  try {
    const { readFile } = await import("node:fs/promises");
    const file = new URL("../.dev.vars", import.meta.url);
    const contents = await readFile(file, "utf8");
    return contents.split(/\r?\n/u).reduce((environment, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return environment;
      const [key, ...rest] = trimmed.split("=");
      if (key === "CUSTOMER_SESSION_SECRET" || key === "SESSION_SECRET") {
        environment[key] = rest.join("=");
      }
      return environment;
    }, {} as CustomerRuntimeEnvironment);
  } catch {
    return runtime;
  }
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
