import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1).default('http://localhost:3001/api/v1'),
  NEXT_PUBLIC_WS_URL: z.string().min(1).default('ws://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Forja Selvagem'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().default('development'),
});

export type WebEnv = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): WebEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuração de ambiente inválida: ${details}`);
  }

  return result.data;
}

export const env = parseEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
});
