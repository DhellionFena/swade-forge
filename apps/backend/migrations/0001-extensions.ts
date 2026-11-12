import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Extensions0000000000001 implements MigrationInterface {
  name = 'Extensions0000000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
    await queryRunner.query('DROP EXTENSION IF EXISTS "pgcrypto"');
  }
}
