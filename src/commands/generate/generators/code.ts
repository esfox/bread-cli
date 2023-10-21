import { databaseConnectionString } from '../../../constants';
import { getAutocompleteFuzzySuggest, getDirectoriesInCwd } from '../helpers';
import { formatCodeInFolder, hygenRun } from '../helpers/code';
import {
  checkConnection,
  getFullTableName,
  getPrimaryKeys,
  getTables,
  isBooleanType,
  isNumberType,
} from '../helpers/database';

import fastGlob from 'fast-glob';
import { capitalize } from 'inflection';
import { ColumnMetadata, TableMetadata } from 'kysely';
import prompts from 'prompts';

import { execSync } from 'child_process';
import { join } from 'path';

const { globSync } = fastGlob;

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

async function promptInputs(
  tables: TableMetadata[],
  fromOneTable?: boolean,
): Promise<
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

  const tableChoices: prompts.Choice[] = tables.map((table) => ({
    title: table.name,
    value: table,
  }));

  const questions: prompts.PromptObject[] = [
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
  ];

  if (fromOneTable) {
    questions.push({
      type: 'autocomplete',
      name: 'table',
      message: 'Select the database table to introspect',
      choices: tableChoices,
      suggest: getAutocompleteFuzzySuggest(),
      validate: (values: string[]) => values?.length !== 0 || 'Please select a table',
    });
  }

  const inputs = await prompts(questions);
  if (!inputs.templatesPath || !inputs.outputPath) {
    console.log('❌ Incomplete inputs');
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
  const templateFiles = globSync(['**/*.ejs.t'], {
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

function runCommand(commandType: 'pre-generate' | 'post-generate', command: string) {
  const capitalizedCommandType = capitalize(commandType);
  try {
    console.log(`\n⌛ Running ${commandType} command:\n\`${command}\``);
    const stdout = execSync(command).toString().trim();
    if (stdout || stdout !== '') {
      console.log(`\n✅ ${capitalizedCommandType} command result:\n${stdout}`);
    }
  } catch (error) {
    console.log(`❌ ${capitalizedCommandType} command failed. Please try again.`);
    return false;
  }

  return true;
}

type TableTemplateData = {
  schemaName?: string;
  tableName: string;
  primaryKey: string;
  columns: (ColumnMetadata & { type: string })[];
};

async function getTemplateData(tables: TableMetadata[], selectedTables: TableMetadata[]) {
  const templateData: TableTemplateData[] = [];
  const selectedTemplateData: TableTemplateData[] = [];

  const tableNames = tables.map((table) => table.name);
  const primaryKeyMap = await getPrimaryKeys(tableNames);

  for (const table of tables) {
    const { name, schema, columns: columnsMeta } = table;
    const primaryKey = primaryKeyMap[name];

    const columns: (ColumnMetadata & { type: string })[] = columnsMeta.map((column) => {
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

    const tableTemplateData: TableTemplateData = {
      schemaName: schema,
      tableName: name,
      primaryKey,
      columns,
    };

    templateData.push(tableTemplateData);

    const fullTableName = getFullTableName(table);
    for (const selectedTable of selectedTables) {
      if (fullTableName === getFullTableName(selectedTable)) {
        selectedTemplateData.push(tableTemplateData);
      }
    }
  }

  return selectedTemplateData.map((item) => ({
    allTables: templateData,
    ...item,
  }));
}

export type GenerateCodeParameters = {
  fromOneTable?: boolean;
  preGenerate?: string;
  postGenerate?: string;
};

export async function generateCode({
  fromOneTable,
  preGenerate,
  postGenerate,
}: GenerateCodeParameters) {
  const connectedToDatabase = await validateDatabaseConnection();
  if (!connectedToDatabase) {
    return;
  }

  const databaseTables = await getTables();

  const inputs = await promptInputs(databaseTables, fromOneTable);
  if (!inputs) {
    return;
  }

  const { templatesPath, outputPath, table } = inputs;

  const hasTemplates = validateTemplates(templatesPath);
  if (!hasTemplates) {
    return;
  }

  const selectedTables = fromOneTable ? [table] : databaseTables;
  const templateDataArray = await getTemplateData(databaseTables, selectedTables);

  if (preGenerate) {
    const preGenerateSuccess = runCommand('pre-generate', preGenerate);
    if (!preGenerateSuccess) {
      return;
    }
  }

  const generateActions = [];
  for (const templateDataItem of templateDataArray) {
    const { tableName } = templateDataItem;

    console.log(`\n⌛ Generating code for table \`${tableName}\`...`);

    const { actions } = await hygenRun({
      templatesPath,
      outputPath,
      templateData: templateDataItem,
    });

    generateActions.push(actions);
  }

  if (generateActions.length === 0) {
    console.log('❌ No code was generated');
    return;
  }

  if (postGenerate) {
    const postGenerateSuccess = runCommand('post-generate', postGenerate);
    if (!postGenerateSuccess) {
      return;
    }
  }

  formatCodeInFolder(outputPath);

  console.log('✔️  Done');
  console.log('🔔 Please check, inspect and validate the generated code');
}
