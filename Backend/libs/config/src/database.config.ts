import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://usuario_pg:password_seguro@db:5432/pasarela_db',
  type: 'postgres',
  synchronize: process.env.NODE_ENV !== 'production',
}));
