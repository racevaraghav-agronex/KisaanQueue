/**
 * Frontend Validation utilities for Indian mobile numbers and email addresses.
 * Matches backend validation rules exactly.
 */

export function normalizeIndianMobile(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim().replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (indianMobileRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export function isValidIndianMobile(raw: string | undefined | null): boolean {
  return normalizeIndianMobile(raw) !== null;
}

export const MOBILE_ERROR_MESSAGE = 'Enter a valid 10-digit Indian mobile number.';

export function isValidEmail(raw: string | undefined | null, isOptional = false): boolean {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return isOptional;
  }

  const trimmed = raw.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export const EMAIL_ERROR_MESSAGE = 'Enter a valid email address.';
