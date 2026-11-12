import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { validateEnv } from './infrastructure/config/env.validation.js';
import { buildTypeOrmOptions } from './infrastructure/persistence/typeorm.options.js';
import { HealthModule } from './presentation/http/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          genReqId: (request: IncomingMessage, response: ServerResponse) => {
            const header = request.headers['x-request-id'];
            const requestId =
              typeof header === 'string' && header.length > 0 ? header : randomUUID();
            response.setHeader('x-request-id', requestId);
            return requestId;
          },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          transport:
            config.get<string>('NODE_ENV') === 'production'
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:standard' },
                },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    HealthModule,
  ],
})
export class AppModule {}
