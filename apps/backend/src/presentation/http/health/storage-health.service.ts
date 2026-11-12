import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, constants, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface StorageStatus {
  used: number;
  max: number;
  percent: number;
  path: string;
}

@Injectable()
export class StorageHealthService {
  private readonly storagePath: string;
  private readonly maxBytes: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.storagePath = config.get<string>('STORAGE_PATH') ?? './storage';
    this.maxBytes = config.get<number>('STORAGE_MAX_BYTES') ?? 1_073_741_824;
  }

  async getStatus(): Promise<StorageStatus> {
    const used = await directorySize(this.storagePath);
    const percent = this.maxBytes > 0 ? Math.round((used / this.maxBytes) * 100) : 0;

    return { used, max: this.maxBytes, percent, path: this.storagePath };
  }

  async isWritable(): Promise<boolean> {
    try {
      await mkdir(this.storagePath, { recursive: true });
      await access(this.storagePath, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}

async function directorySize(directory: string): Promise<number> {
  let entries;

  try {
    entries = await readdir(directory, { recursive: true, withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  let total = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    try {
      const fileStat = await stat(join(entry.parentPath, entry.name));
      total += fileStat.size;
    } catch {
      // File may disappear between readdir and stat; ignore it.
    }
  }

  return total;
}
