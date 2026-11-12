import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    TZ: z.string().default('America/Sao_Paulo'),

    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgresql://forja:forja@localhost:5432/forja_selvagem'),
    DATABASE_SSL: booleanFromString,

    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres').optional(),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    COOKIE_DOMAIN: z.string().default('localhost'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    STORAGE_PATH: z.string().default('./storage'),
    STORAGE_MAX_BYTES: z.coerce.number().int().positive().default(1_073_741_824),
    STORAGE_MAX_FILE_BYTES: z.coerce.number().int().positive().default(5_242_880),

    RUN_MIGRATIONS: booleanFromString,
    RUN_SEED: booleanFromString,

    LOG_LEVEL: z.enum(logLevels).default('info'),
    SQL_LOG: booleanFromString,
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().default('development'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET é obrigatório em produção',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
