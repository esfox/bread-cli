import { TemplateName } from '../../../constants';
import { getAutocompleteFuzzySuggest, getDirectoriesInCwd } from '../helpers';
import { hygenRun } from '../helpers/code';

import prompts from 'prompts';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const currentDirectory = dirname(fileURLToPath(import.meta.url));

export async function generateMigration() {
  const paths = getDirectoriesInCwd();
  const pathChoices: prompts.Choice[] = paths.map((path) => ({
    title: path,
    value: path,
  }));

  const { migrationName, migrationsPath } = await prompts([
    {
      type: 'text',
      name: 'migrationName',
      message: 'Give a name for the migration (snake_case is recommended)',
      validate: (value) => !!value || 'Name is required',
    },
    {
      type: 'autocomplete',
      name: 'migrationsPath',
      message: 'Path to migration files',
      choices: pathChoices,
      suggest: getAutocompleteFuzzySuggest(),
    },
  ]);

  if (!migrationName || !migrationsPath) {
    return;
  }

  /* Get the current timestamp without milliseconds
    and format it with underscores. (e.g. 20230923_132945) */
  const timestamp = new Date()
    .toISOString()
    .substring(0, 19)
    .replace(/T/g, '_')
    .replace(/-|:|Z/g, '');

  await hygenRun({
    templatesPath: join(currentDirectory, '..', 'templates'),
    templatesName: TemplateName.Migration,
    outputPath: join(process.cwd(), migrationsPath as string),
    templateData: { migrationsPath, migrationName, timestamp },
  });
}
