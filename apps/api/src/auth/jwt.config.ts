export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
  accessTokenExpiry: '15m',
  refreshTokenDays: 7,
} as const;
