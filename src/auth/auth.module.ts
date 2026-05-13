import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      // Baca dari .env → JWT_SECRET dan JWT_EXPIRES_IN
      secret: process.env.JWT_SECRET || 'SECRET_KEY_SUPER_AMAN',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '60m') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
