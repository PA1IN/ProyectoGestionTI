import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const expectedUsername = this.configService.get<string>('AUTH_USERNAME') || 'admin';
    const expectedPassword = this.configService.get<string>('AUTH_PASSWORD') || 'admin123';

    if (loginDto.username !== expectedUsername || loginDto.password !== expectedPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: 1,
      username: expectedUsername,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    };
  }

  getProfile(user: JwtPayload) {
    return user;
  }
}