import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';
import { StorageHealthService } from './storage-health.service.js';

@Module({
  controllers: [HealthController],
  providers: [StorageHealthService],
})
export class HealthModule {}
