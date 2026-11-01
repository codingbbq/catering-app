import { describe, expect, it } from 'vitest';

const VALID_TRANSITIONS: Record<string, string[]> = {
  onboarding: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

describe('Tenant lifecycle transitions', () => {
  it('onboarding -> active is allowed', () => {
    expect(VALID_TRANSITIONS['onboarding']).toContain('active');
  });

  it('onboarding -> suspended is not allowed', () => {
    expect(VALID_TRANSITIONS['onboarding']).not.toContain('suspended');
  });

  it('active -> suspended is allowed', () => {
    expect(VALID_TRANSITIONS['active']).toContain('suspended');
  });

  it('active -> archived is allowed', () => {
    expect(VALID_TRANSITIONS['active']).toContain('archived');
  });

  it('suspended -> active is allowed (reactivation)', () => {
    expect(VALID_TRANSITIONS['suspended']).toContain('active');
  });

  it('suspended -> archived is allowed', () => {
    expect(VALID_TRANSITIONS['suspended']).toContain('archived');
  });

  it('archived has no valid transitions', () => {
    expect(VALID_TRANSITIONS['archived']).toHaveLength(0);
  });
});
