import 'dotenv/config';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';

import { envSchema } from '../config/env.schema.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const env = envSchema.parse(process.env);

export default new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  entities: [join(currentDir, '../../**/*.entity.{ts,js}')],
  migrations: [
    // Compiled migrations (dist/migrations) run in containers.
    join(currentDir, '../../migrations/*.{ts,js}'),
    // TypeScript migrations run locally through tsx.
    join(currentDir, '../../../migrations/*.{ts,js}'),
  ],
  synchronize: false,
  migrationsRun: false,
  logging: env.SQL_LOG ? 'all' : ['error', 'warn'],
});
