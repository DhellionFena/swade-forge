export const APP_NAME = 'Forja Selvagem';

export type UserRole = 'admin' | 'master' | 'player';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  checks?: Record<string, 'up' | 'down'>;
}
