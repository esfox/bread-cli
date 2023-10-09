import { databaseConnectionString } from '../constants';
import { getAutocompleteFuzzySuggest, getDirectoriesInCwd } from '../helpers';
import { formatCodeInFolder, hygenRun } from '../helpers/code';
import {
  getTables,
  getPrimaryKeys,
  isNumberType,
  isBooleanType,
  checkConnection,
} from '../helpers/database';

import { globSync } from 'fast-glob';
import { ColumnMetadata, TableMetadata } from 'kysely';
import prompts from 'prompts';

import { execSync } from 'child_process';
import { join } from 'path';

async function validateDatabaseConnection() {
  if (!databaseConnectionString) {
    console.log('❌ No database connection string');
    return;
  }

  try {
    await checkConnection();
  } catch (error) {
    console.debug(error);
    console.log('❌ Cannot connect to database');
    return;
  }

  return true;
}

async function promptInputs(): Promise<
  | {
      templatesPath: string;
      outputPath: string;
      table: TableMetadata;
    }
  | undefined
> {
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
      suggest: getAutocompleteFuzzySuggest(),
    },
    {
      type: 'autocomplete',
      name: 'outputPath',
      message: 'Path where to generate code',
      choices: pathChoices,
      suggest: getAutocompleteFuzzySuggest(),
    },
    {
      type: 'autocomplete',
      name: 'table',
      message: 'Select the database table to introspect',
      choices: tableChoices,
      suggest: getAutocompleteFuzzySuggest(),
      validate: (values: string[]) => values?.length !== 0 || 'Please select a table',
    },
  ]);

  if (!inputs.table || inputs.table.length === 0) {
    return;
  }

  const cwd = process.cwd();

  return {
    templatesPath: join(cwd, inputs.templatesPath as string),
    outputPath: join(cwd, inputs.outputPath as string),
    table: inputs.table,
  };
}

function validateTemplates(templatesPath: string) {
  const templateFiles = globSync(['*.ejs.t'], {
    ignore: ['node_modules'],
    onlyFiles: true,
    suppressErrors: true,
    cwd: templatesPath,
  });

  if (templateFiles.length === 0) {
    console.log('❌ No template files');
    return;
  }

  return true;
}

async function getTemplateData(table: TableMetadata) {
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

  return {
    tableName,
    primaryKey,
    columns,
  };
}

export async function generateCode(preGenerate?: string) {
  const connectedToDatabase = await validateDatabaseConnection();
  if (!connectedToDatabase) {
    return;
  }

  const inputs = await promptInputs();
  if (!inputs) {
    return;
  }

  const { templatesPath, outputPath, table } = inputs;

  const hasTemplates = validateTemplates(templatesPath);
  if (!hasTemplates) {
    return;
  }

  const templateData = await getTemplateData(table);

  if (preGenerate) {
    try {
      console.log(`\n⌛ Running pre-generate command:\n\`${preGenerate}\``);
      const stdout = execSync(preGenerate).toString().trim();
      if (stdout || stdout !== '') {
        console.log(`\n✅ Pre-generate command result:\n${stdout}`);
      }
    } catch (error) {
      console.log('❌ Pre-generate command failed. Please try again.');
      return;
    }
  }

  const { actions } = await hygenRun({
    templatesPath,
    outputPath,
    templateData,
  });

  if (actions.length === 0) {
    console.log('❌ No code was generated');
    return;
  }

  formatCodeInFolder(outputPath);

  console.log('✔️  Done');
  console.log('🔔 Please check, inspect and validate the generated code');
}
