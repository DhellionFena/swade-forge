import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { StorageHealthService, type StorageStatus } from './storage-health.service.js';

interface LivenessResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

interface ReadinessResponse {
  status: 'ok';
  timestamp: string;
  checks: {
    database: 'up';
    storage: 'up';
  };
}

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(StorageHealthService) private readonly storageHealth: StorageHealthService,
  ) {}

  @Get()
  liveness(): LivenessResponse {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness(): Promise<ReadinessResponse> {
    const [database, storage] = await Promise.all([
      this.checkDatabase(),
      this.storageHealth.isWritable(),
    ]);

    if (!database || !storage) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          database: database ? 'up' : 'down',
          storage: storage ? 'up' : 'down',
        },
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: { database: 'up', storage: 'up' },
    };
  }

  @Get('storage')
  storageStatus(): Promise<StorageStatus> {
    return this.storageHealth.getStatus();
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
