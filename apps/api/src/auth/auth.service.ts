import { HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, SessionPrincipalKind, UserStatus } from '@syarat/database';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

import { type Environment } from '@syarat/config';
import { PrismaService } from '../database/prisma.service';
import { normalizeSaudiPhone } from './phone-normalizer';
import { verifyPassword } from './password-hash';
import { type AuthSession, type AccessTokenPayload } from './auth.types';
import { type RequestOtpDto } from './dto/request-otp.dto';
import { type StaffLoginDto } from './dto/staff-login.dto';
import { type VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly environment: Environment
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ challengeId: string; expiresInSeconds: number }> {
    const phoneE164 = normalizeSaudiPhone(dto.phone);
    const phoneHash = this.hashPhone(phoneE164);
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const existingUser = await this.prisma.user.findUnique({ where: { phoneHash } });
    const recentChallenge = await this.prisma.otpChallenge.findFirst({ where: { phoneHash, purpose: dto.purpose as OtpPurpose, createdAt: { gte: new Date(Date.now() - 60_000) } }, select: { id: true } });
    if (recentChallenge) throw new HttpException({ code: 'OTP_RESEND_LIMIT', message: 'انتظر دقيقة قبل طلب رمز تحقق جديد.' }, HttpStatus.TOO_MANY_REQUESTS);

    await this.prisma.otpChallenge.create({
      data: {
        id: challengeId,
        userId: existingUser?.id,
        phoneHash,
        purpose: dto.purpose as OtpPurpose,
        codeHash: this.hashOtp(challengeId, code),
        expiresAt: new Date(Date.now() + this.environment.OTP_TTL_SECONDS * 1_000),
        maxAttempts: this.environment.OTP_MAX_ATTEMPTS
      }
    });

    // A production notification adapter is intentionally required before this endpoint is enabled.
    // Never log, return, or persist the raw OTP outside the protected delivery channel.
    throw new ServiceUnavailableException({
      code: 'OTP_DELIVERY_NOT_CONFIGURED',
      message: 'خدمة إرسال رمز التحقق غير مهيأة بعد.'
    });
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthSession> {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: dto.challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException({ code: 'OTP_INVALID_OR_EXPIRED', message: 'رمز التحقق غير صالح أو منتهي.' });
    }

    const candidateHash = this.hashOtp(challenge.id, dto.code);
    const isValid = timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(candidateHash));
    if (!isValid) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } }
      });
      throw new UnauthorizedException({ code: 'OTP_INVALID_OR_EXPIRED', message: 'رمز التحقق غير صالح أو منتهي.' });
    }

    const phoneHash = challenge.phoneHash;
    const user = await this.prisma.user.upsert({
      where: { phoneHash },
      create: { phoneHash },
      update: {}
    });

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date(), userId: user.id }
    });

    return this.createSession(user.id, 'customer');
  }

  async staffLogin(dto: StaffLoginDto): Promise<AuthSession> {
    const phoneHash = this.hashPhone(normalizeSaudiPhone(dto.phone));
    const user = await this.prisma.user.findUnique({ where: { phoneHash } });

    if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة.' });
    }

    const isValid = verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة.' });
    }

    return this.createSession(user.id, 'staff');
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const current = await this.prisma.session.findUnique({ where: { refreshTokenHash } });

    if (!current || current.refreshTokenExpiresAt <= new Date()) {
      throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'انتهت الجلسة أو لم تعد صالحة.' });
    }

    if (current.revokedAt) {
      await this.prisma.session.updateMany({
        where: { refreshTokenFamilyId: current.refreshTokenFamilyId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_REUSE', message: 'انتهت الجلسة أو لم تعد صالحة.' });
    }

    await this.prisma.session.update({ where: { id: current.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
    return this.createSession(current.userId, current.principalKind === SessionPrincipalKind.STAFF ? 'staff' : 'customer', current.refreshTokenFamilyId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  private async createSession(
    userId: string,
    kind: AccessTokenPayload['kind'],
    refreshTokenFamilyId: string = randomUUID()
  ): Promise<AuthSession> {
    const refreshToken = randomUUID() + randomUUID();
    const refreshTokenExpiresAt = new Date(Date.now() + this.environment.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    const session = await this.prisma.session.create({
      data: {
        userId,
        principalKind: kind === 'staff' ? SessionPrincipalKind.STAFF : SessionPrincipalKind.CUSTOMER,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        refreshTokenFamilyId,
        refreshTokenExpiresAt
      }
    });
    const payload: AccessTokenPayload = { sub: userId, sid: session.id, kind };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken,
      expiresInSeconds: this.environment.JWT_ACCESS_TTL_SECONDS
    };
  }

  private hashPhone(phoneE164: string): string {
    return createHmac('sha256', this.environment.OTP_HMAC_SECRET).update(phoneE164).digest('hex');
  }

  private hashOtp(challengeId: string, code: string): string {
    return createHmac('sha256', this.environment.OTP_HMAC_SECRET).update(`${challengeId}:${code}`).digest('hex');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac('sha256', this.environment.JWT_ACCESS_SECRET).update(refreshToken).digest('hex');
  }
}
