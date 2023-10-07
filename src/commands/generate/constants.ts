import { config } from 'dotenv';
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import { promises as fs } from 'fs';
import * as path from 'path';

config();

export const databaseConnectionString = process.env.DB_CONNECTION;
export const databaseSchema = process.env.DB_SCHEMA ?? 'public';
export const migrationFolder = path.join(__dirname, '..', 'database', 'migrations');

/* Setup database connection and migrator */
export const databaseConnection = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: databaseConnectionString,
    }),
  }),
});

export const migrator = new Migrator({
  db: databaseConnection,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

export enum TemplateName {
  Migration = 'migration',
}
