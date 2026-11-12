import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
    ssl: config.get<boolean>('DATABASE_SSL') ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: config.get<boolean>('SQL_LOG') ? 'all' : ['error', 'warn'],
    retryAttempts: 10,
    retryDelay: 3_000,
  };
}
