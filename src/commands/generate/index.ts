import { generateCode } from './generators/code';
import { generateMigration } from './generators/migration';

import { exitAfter } from '../../helpers';

import { program } from 'commander';
import prompts from 'prompts';

enum GenerateType {
  Migration = 'migration',
  Code = 'code',
}

type Option = {
  preGenerate: string;
};

async function run(type: string | undefined, options: Option) {
  const { preGenerate } = options;

  let generateType = type;
  if (!generateType) {
    const { type: typeInput } = await prompts({
      type: 'select',
      name: 'type',
      message: 'What should be generated?',
      choices: [
        {
          title: 'Migration file',
          value: GenerateType.Migration,
        },
        {
          title: 'Code from an introspected table in a database',
          value: GenerateType.Code,
        },
      ],
    });

    generateType = typeInput;
  }

  switch (generateType) {
    case GenerateType.Migration:
      await generateMigration();
      break;

    case GenerateType.Code:
      await generateCode(preGenerate);
      break;

    default:
      console.log('❌ Invalid type to generate');
      break;
  }
}

program
  .command('generate')
  .alias('g')
  .description('Generate code')
  .argument('[type]')
  .option('-pre, --pre-generate <command>', 'Command/s to run before code generation')
  .action(exitAfter(run));
