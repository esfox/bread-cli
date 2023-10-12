import { databaseConnection, databaseSchema, migrationsPath } from '../../constants';
import { exitAfter } from '../../helpers';

import { program } from 'commander';
import { FileMigrationProvider, Migrator } from 'kysely';

import { promises as fs } from 'fs';
import * as path from 'path';

const migrator = new Migrator({
  db: databaseConnection,
  migrationTableSchema: databaseSchema,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(process.cwd(), migrationsPath),
  }),
});

export async function migrate() {
  console.log('⌛ Running all database migrations...');

  const { error } = await migrator.migrateToLatest();
  if (error) {
    console.log('❌ Failed to run migrations');
    console.log(error);
    return;
  }

  console.log('✔️  Done');
}

export async function reset() {
  console.log('⌛ Rollbacking all database migrations...');
  const migrations = await migrator.getMigrations();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of migrations) {
    const { error } = await migrator.migrateDown();
    if (error) {
      console.log('❌ Failed to rollback migration');
      console.log(error);
      return;
    }
  }

  console.log('✔️  Done');
}

export async function rollback() {
  console.log('⌛ Rollbacking one database migration...');

  const { error } = await migrator.migrateDown();
  if (error) {
    console.log('❌ Failed to rollback migration');
    console.log(error);
    return;
  }

  console.log('✔️  Done');
}

program.command('migrate').description('Runs all database migrations').action(exitAfter(migrate));

program
  .command('rollback')
  .description('Rollback one database migration')
  .action(exitAfter(rollback));

program.command('reset').description('Rollback all database migrations').action(exitAfter(reset));
