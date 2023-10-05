import { TemplateName } from '../constants';
import { hygenRun } from '../helpers';

import { globSync } from 'fast-glob';
import prompts from 'prompts';

import { join } from 'path';

export async function generateMigration() {
  const cwd = process.cwd();
  const paths = globSync(['./**/*'], {
    ignore: ['node_modules'],
    onlyDirectories: true,
    suppressErrors: true,
    cwd,
  }).sort();

  paths.unshift('.');

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
    templatesPath: join(__dirname, '..', 'templates'),
    templatesName: TemplateName.Migration,
    outputPath: join(cwd, migrationsPath as string),
    templateData: { migrationsPath, migrationName, timestamp },
  });
}