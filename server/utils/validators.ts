/**
 * Validation utilities for Indian mobile numbers and email addresses.
 * Used on backend to enforce strict data integrity.
 */

/**
 * Normalizes an Indian mobile number.
 * Removes all spaces, dashes, parentheses, leading '+91', '91' prefix (if 12 digits), or leading '0'.
 * Returns the clean 10-digit string if it matches Indian mobile rules (starts with 6, 7, 8, 9),
 * otherwise returns null.
 */
export function normalizeIndianMobile(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Trim spaces and remove common punctuation
  let cleaned = raw.trim().replace(/[\s\-()]/g, '');

  // Strip leading +91 or 91 if it results in a 10-digit number
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If 12 digits starting with 91, strip the country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }

  // If 11 digits starting with 0 (trunk prefix), strip leading 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Exactly 10 digits, first digit must be 6, 7, 8 or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (indianMobileRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Checks if a given mobile string is a valid Indian mobile number.
 */
export function isValidIndianMobile(raw: string | undefined | null): boolean {
  return normalizeIndianMobile(raw) !== null;
}

export const MOBILE_ERROR_MESSAGE = 'Enter a valid 10-digit Indian mobile number.';

/**
 * Validates an email address.
 * If isOptional is true and the input is empty or undefined, returns true.
 * If entered, it must match a standard email format.
 * Rejects invalid strings like 'abc', 'abc@', 'abc.com@', '@abc.com'.
 */
export function isValidEmail(raw: string | undefined | null, isOptional = false): boolean {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return isOptional;
  }

  const trimmed = raw.trim();

  // Standard robust email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export const EMAIL_ERROR_MESSAGE = 'Enter a valid email address.';
