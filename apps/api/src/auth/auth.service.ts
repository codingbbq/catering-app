import type {
  AuthenticatedRequestContext,
  ForgotPasswordRequest,
  InvitationAcceptRequest,
  PlatformRole,
  PlatformSignInResponse,
  RefreshResponse,
  ResetPasswordRequest,
  SignInRequest,
  TenantRole,
  TenantSignInResponse,
  TenantStatus,
} from '@catering/shared-types';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './jwt-payload.types.js';
import { JWT_CONFIG } from './jwt.config.js';
import { hashPassword, verifyPassword } from './password.utils.js';
import { generateRefreshToken, generateResetToken } from './token.utils.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // --- Platform sign-in ---

  async platformSignIn(dto: SignInRequest): Promise<PlatformSignInResponse> {
    const user = await this.prisma.platformUser.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      scope: 'platform',
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: JWT_CONFIG.accessTokenExpiry });
    const refreshToken = generateRefreshToken();

    await this.prisma.session.create({
      data: {
        refreshToken,
        scope: 'platform',
        platformUserId: user.id,
        expiresAt: new Date(Date.now() + JWT_CONFIG.refreshTokenDays * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Platform sign-in: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  // --- Tenant sign-in ---

  async tenantSignIn(dto: SignInRequest, tenantSlug: string): Promise<TenantSignInResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (tenant.status === 'suspended' || tenant.status === 'archived') {
      throw new ForbiddenException('Tenant access is not available.');
    }

    const user = await this.prisma.tenantUser.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId: tenant.id } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      scope: 'tenant',
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: JWT_CONFIG.accessTokenExpiry });
    const refreshToken = generateRefreshToken();

    await this.prisma.session.create({
      data: {
        refreshToken,
        scope: 'tenant',
        tenantUserId: user.id,
        tenantId: tenant.id,
        expiresAt: new Date(Date.now() + JWT_CONFIG.refreshTokenDays * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Tenant sign-in: ${user.email} on ${tenantSlug}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    };
  }

  // --- Refresh ---

  async refreshTokens(currentRefreshToken: string): Promise<RefreshResponse> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: currentRefreshToken },
      include: { platformUser: true, tenantUser: { include: { tenant: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Session expired or invalid.');
    }

    let payload: JwtPayload;

    if (session.scope === 'platform' && session.platformUser) {
      if (!session.platformUser.isActive) {
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Account is deactivated.');
      }
      payload = {
        sub: session.platformUser.id,
        email: session.platformUser.email,
        displayName: session.platformUser.displayName,
        scope: 'platform',
        role: session.platformUser.role,
      };
    } else if (session.scope === 'tenant' && session.tenantUser) {
      if (!session.tenantUser.isActive) {
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Account is deactivated.');
      }
      const tenant = session.tenantUser.tenant;
      if (tenant.status === 'suspended' || tenant.status === 'archived') {
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new ForbiddenException('Tenant access is not available.');
      }
      payload = {
        sub: session.tenantUser.id,
        email: session.tenantUser.email,
        displayName: session.tenantUser.displayName,
        scope: 'tenant',
        role: session.tenantUser.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantStatus: tenant.status,
      };
    } else {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Session is invalid.');
    }

    const accessToken = this.jwt.sign(payload, { expiresIn: JWT_CONFIG.accessTokenExpiry });
    const newRefreshToken = generateRefreshToken();

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + JWT_CONFIG.refreshTokenDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // --- Sign-out ---

  async signOut(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (session) {
      await this.prisma.session.delete({ where: { id: session.id } });
      this.logger.log(`Sign-out: session ${session.id}`);
    }
  }

  // --- Invitation accept ---

  async acceptInvitation(dto: InvitationAcceptRequest): Promise<TenantSignInResponse> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token: dto.token },
      include: { tenant: true },
    });

    if (!invitation || invitation.status !== 'pending') {
      throw new NotFoundException('Invitation not found or already used.');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new ForbiddenException('Invitation has expired.');
    }

    const passwordHash = await hashPassword(dto.password);

    const [tenantUser] = await this.prisma.$transaction([
      this.prisma.tenantUser.create({
        data: {
          email: invitation.email,
          passwordHash,
          displayName: dto.displayName,
          role: invitation.role,
          tenantId: invitation.tenantId,
          invitedBy: invitation.invitedBy,
        },
      }),
      this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      }),
    ]);

    this.logger.log(`Invitation accepted: ${invitation.email} on tenant ${invitation.tenant.slug}`);

    return this.tenantSignIn(
      { email: tenantUser.email, password: dto.password },
      invitation.tenant.slug,
    );
  }

  // --- Forgot password ---

  async forgotPassword(dto: ForgotPasswordRequest): Promise<{ message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (!tenant) {
      return { message: 'If the account exists, a reset link will be sent.' };
    }

    const user = await this.prisma.tenantUser.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId: tenant.id } },
    });

    if (!user || !user.isActive) {
      return { message: 'If the account exists, a reset link will be sent.' };
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.tenantUser.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // TODO: Send email with reset link. For now, log the token.
    this.logger.warn(`Password reset token for ${user.email}: ${resetToken}`);

    return { message: 'If the account exists, a reset link will be sent.' };
  }

  // --- Reset password ---

  async resetPassword(dto: ResetPasswordRequest): Promise<{ message: string }> {
    const user = await this.prisma.tenantUser.findUnique({
      where: { resetToken: dto.token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new ForbiddenException('Reset token is invalid or expired.');
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.tenantUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Revoke all existing sessions for security
    await this.prisma.session.deleteMany({
      where: { tenantUserId: user.id },
    });

    this.logger.log(`Password reset completed for ${user.email}`);

    return { message: 'Password has been reset successfully.' };
  }

  // --- Verify JWT and build authenticated context ---

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, { secret: JWT_CONFIG.secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  buildAuthenticatedContext(payload: JwtPayload): AuthenticatedRequestContext {
    if (payload.scope === 'platform') {
      return {
        scope: 'platform',
        userId: payload.sub,
        role: payload.role as PlatformRole,
      };
    }

    return {
      scope: 'tenant',
      userId: payload.sub,
      role: payload.role as TenantRole,
      tenantId: payload.tenantId!,
      tenantSlug: payload.tenantSlug,
      tenantStatus: (payload.tenantStatus ?? 'active') as TenantStatus,
    };
  }
}
