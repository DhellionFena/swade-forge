import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies local development defaults', () => {
    const env = parseEnv({});

    expect(env.NEXT_PUBLIC_APP_NAME).toBe('Forja Selvagem');
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3001/api/v1');
    expect(env.NEXT_PUBLIC_WS_URL).toBe('ws://localhost:3001');
  });

  it('keeps explicit values', () => {
    const env = parseEnv({
      NEXT_PUBLIC_APP_NAME: 'Mesa do Mestre',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
      NEXT_PUBLIC_WS_URL: 'wss://api.example.com',
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'production',
    });

    expect(env.NEXT_PUBLIC_APP_NAME).toBe('Mesa do Mestre');
    expect(env.NEXT_PUBLIC_API_URL).toBe('https://api.example.com/api/v1');
    expect(env.NEXT_PUBLIC_WS_URL).toBe('wss://api.example.com');
    expect(env.NEXT_PUBLIC_SENTRY_ENVIRONMENT).toBe('production');
  });
});
