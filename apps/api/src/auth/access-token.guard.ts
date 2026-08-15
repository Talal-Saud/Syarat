import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@syarat/database';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../database/prisma.service';
import { type AccessTokenPayload } from './auth.types';

type AuthenticatedRequest = FastifyRequest & {
  principal?: AccessTokenPayload;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;

    if (!token) {
      throw new UnauthorizedException({ code: 'ACCESS_TOKEN_REQUIRED', message: 'يلزم تسجيل الدخول لإتمام هذه العملية.' });
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException({ code: 'ACCESS_TOKEN_INVALID', message: 'جلسة الدخول غير صالحة أو منتهية.' });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: { select: { id: true, status: true } } }
    });

    if (!session || session.revokedAt || session.refreshTokenExpiresAt <= new Date() || session.user.id !== payload.sub || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'جلسة الدخول غير صالحة أو منتهية.' });
    }

    request.principal = payload;
    return true;
  }
}
