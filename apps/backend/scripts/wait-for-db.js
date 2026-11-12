#!/usr/bin/env node
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS || 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 2000);

if (!databaseUrl) {
  console.error('[wait-for-db] DATABASE_URL is not set');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({ connectionString: databaseUrl });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.warn(`[wait-for-db] database ready after ${attempt} attempt(s)`);
      return;
    } catch (error) {
      await client.end().catch(() => undefined);
      if (attempt === maxAttempts) {
        throw error;
      }
      console.warn(
        `[wait-for-db] attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying...`,
      );
      await sleep(delayMs);
    }
  }
}

waitForDatabase().catch((error) => {
  console.error('[wait-for-db] database did not become ready', error);
  process.exit(1);
});
