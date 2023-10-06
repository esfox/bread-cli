import { formatCodeInFolder, hygenRun } from '../helpers/code';
import { getTables, getPrimaryKeys, isNumberType, isBooleanType } from '../helpers/database';
import { getDirectoriesInCwd } from '../helpers/files';

import { ColumnMetadata, TableMetadata } from 'kysely';
import prompts from 'prompts';

import { join } from 'path';

async function promptInputs(): Promise<{
  templatesPath: string;
  outputPath: string;
  table: TableMetadata;
}> {
  const paths = getDirectoriesInCwd();
  const pathChoices: prompts.Choice[] = paths.map((path) => ({
    title: path,
    value: path,
  }));

  const databaseTables = await getTables();
  const tableChoices: prompts.Choice[] = databaseTables.map((table) => {
    const { name, schema } = table;
    return {
      title: schema ? `${schema}.${name}` : name,
      value: table,
    };
  });

  const inputs = await prompts([
    {
      type: 'autocomplete',
      name: 'templatesPath',
      message: 'Path of code template files',
      choices: pathChoices,
    },
    {
      type: 'autocomplete',
      name: 'outputPath',
      message: 'Path where to generate code',
      choices: pathChoices,
    },
    {
      type: 'autocomplete',
      name: 'table',
      message: 'Select the database table to introspect',
      choices: tableChoices,
      validate: (values: string[]) => values?.length !== 0 || 'Please select a table',
    },
  ]);

  if (!inputs.table || inputs.table.length === 0) {
    throw new Error('Please select a table');
  }

  const cwd = process.cwd();

  return {
    templatesPath: join(cwd, inputs.templatesPath as string),
    outputPath: join(cwd, inputs.outputPath as string),
    table: inputs.table,
  };
}

export async function generateCode() {
  const { templatesPath, outputPath, table } = await promptInputs();

  const tableName = table.name;
  const primaryKeyMap = await getPrimaryKeys([tableName]);
  const primaryKey = primaryKeyMap[table.name];

  const columns: (ColumnMetadata & { type: string })[] = table.columns.map((column) => {
    const { dataType, isNullable } = column;
    let type = 'string';
    if (isNumberType(dataType)) {
      type = 'number';
    } else if (isBooleanType(dataType)) {
      type = 'boolean';
    }
    if (isNullable) {
      type += ' | null';
    }

    return {
      ...column,
      type,
    };
  });

  console.log(`\n⌛ Generating code for table \`${tableName}\`...`);

  const templateData = {
    tableName,
    primaryKey,
    columns,
  };

  await hygenRun({
    templatesPath,
    outputPath,
    templateData,
  });

  formatCodeInFolder(outputPath);

  console.log('✔️  Done');
  console.log('🔔 Please check, inspect and validate the generated code');
}
