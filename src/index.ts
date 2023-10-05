import './commands/generate';

import { program } from 'commander';

program.name('bread');

// program
//   .command('init')
//   .description('Runs all migrations and generates CRUD resource code for each migrated table')
//   .action(() => {});
//
// program
//   .command('migrate')
//   .description('Runs all migrations')
//   .action(() => {});
//
// program
//   .command('rollback')
//   .description('Rollback one migration')
//   .action(() => {});
//
// program
//   .command('reset')
//   .description('Rollbacks all migrations')
//   .action(() => {});

program.parse();
