import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'R4nd0mS3cr3tK3yF0rJWT',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
}));
