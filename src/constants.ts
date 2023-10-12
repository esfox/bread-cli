import { config } from 'dotenv';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

config();

export const databaseConnectionString = process.env.DB_CONNECTION;
export const databaseSchema = process.env.DB_SCHEMA ?? 'public';
export const migrationsPath = process.env.DB_MIGRATIONS_PATH as string;

if (!databaseConnectionString) {
  throw new Error('Please set the DB_CONNECTION environment variable');
}

if (!migrationsPath) {
  throw new Error('Please set the DB_MIGRATIONS_PATH environment variable');
}

/* Setup database connection and migrator */
export const databaseConnection = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: databaseConnectionString,
    }),
  }),
});

export enum TemplateName {
  Migration = 'migration',
}
