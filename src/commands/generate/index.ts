import { generateMigration } from './generators/migration';

import { exitAfter } from '../../helpers';

import { program } from 'commander';
import prompts from 'prompts';

enum GenerateType {
  Migration,
  CrudAll,
  CrudOne,
}

async function run() {
  const { type } = await prompts({
    type: 'select',
    name: 'type',
    message: 'What should be generated?',
    choices: [
      {
        title: 'Migration file',
        value: GenerateType.Migration,
      },
      {
        title: 'CRUD code, all database tables',
        value: GenerateType.CrudAll,
        description: 'CRUD boilerplate code for all the migrated database tables',
      },
      {
        title: 'CRUD code, one database table',
        value: GenerateType.CrudOne,
        description: 'CRUD boilerplate code for one specified migrated database table',
      },
    ],
  });

  switch (type) {
    case GenerateType.Migration:
      await generateMigration();
      break;

    case GenerateType.CrudAll:
      console.log('todo');
      break;

    case GenerateType.CrudOne:
      console.log('todo');
      break;

    default:
      break;
  }
}

program.command('generate').alias('g').description('Generate code').action(exitAfter(run));
