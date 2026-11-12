import { jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import { HealthController } from './health.controller.js';
import type { StorageHealthService, StorageStatus } from './storage-health.service.js';

describe('HealthController', () => {
  const dataSource = { query: jest.fn<() => Promise<unknown>>() };
  const storageHealth = {
    isWritable: jest.fn<() => Promise<boolean>>(),
    getStatus: jest.fn<() => Promise<StorageStatus>>(),
  };

  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController(
      dataSource as unknown as DataSource,
      storageHealth as unknown as StorageHealthService,
    );
  });

  it('reports liveness', () => {
    const response = controller.liveness();

    expect(response.status).toBe('ok');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
    expect(Date.parse(response.timestamp)).not.toBeNaN();
  });

  it('reports readiness when database and storage are up', async () => {
    dataSource.query.mockResolvedValueOnce([{ '?column?': 1 }]);
    storageHealth.isWritable.mockResolvedValueOnce(true);

    await expect(controller.readiness()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: 'up', storage: 'up' },
    });
  });

  it('fails readiness when the database is down', async () => {
    dataSource.query.mockRejectedValueOnce(new Error('connection refused'));
    storageHealth.isWritable.mockResolvedValueOnce(true);

    await expect(controller.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns storage usage', async () => {
    const status: StorageStatus = { used: 1024, max: 2048, percent: 50, path: './storage' };
    storageHealth.getStatus.mockResolvedValueOnce(status);

    await expect(controller.storageStatus()).resolves.toEqual(status);
  });
});
