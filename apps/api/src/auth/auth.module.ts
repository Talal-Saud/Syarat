import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { type Environment } from '@syarat/config';

import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: ['ENVIRONMENT'],
      useFactory: (environment: Environment) => ({
        secret: environment.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: environment.JWT_ACCESS_TTL_SECONDS, algorithm: 'HS256' }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AuthService, AccessTokenGuard, JwtModule]
})
export class AuthModule {}
