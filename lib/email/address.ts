const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/**
 * Shared validation for public booking emails and historical booking records.
 * It deliberately stays lightweight to match the project's existing booking
 * validation rather than introducing a second, incompatible rule.
 */
export function isEmailAddress(value: unknown): value is string {
  return typeof value === "string" && EMAIL_ADDRESS_PATTERN.test(value.trim());
}
