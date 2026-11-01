import { randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}
