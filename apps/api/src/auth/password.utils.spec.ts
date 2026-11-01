import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.utils.js';

describe('password utils', () => {
  it('should hash and verify a password', async () => {
    const password = 'secure-password-123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('should produce different hashes for the same password', async () => {
    const password = 'same-password';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});
