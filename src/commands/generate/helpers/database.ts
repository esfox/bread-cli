import { databaseConnection, databaseSchema } from '../constants';

import { sql } from 'kysely';

export function checkConnection() {
  return sql`SELECT 1`.execute(databaseConnection);
}

export async function getTables() {
  const tables = await databaseConnection.introspection.getTables({
    withInternalKyselyTables: false,
  });

  return tables.filter((table) => !table.isView);
}

export async function getPrimaryKeys(tableNames: string[]) {
  const { rows } = await sql`
    SELECT
      ccu.column_name,
      ccu.table_name
    FROM information_schema.constraint_column_usage AS ccu
    JOIN information_schema.table_constraints AS tc
      USING (constraint_schema, constraint_name)
    JOIN information_schema.columns AS c
      ON c.table_schema = tc.constraint_schema
      AND tc.table_name = c.table_name
      AND ccu.column_name = c.column_name
    WHERE ccu.constraint_schema = ${databaseSchema}
      AND tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_name IN (${sql.join(tableNames)})
  `.execute(databaseConnection);

  const typedRows = rows as { column_name: string; table_name: string }[];
  const map: { [key: string]: string } = {};
  for (const row of typedRows) {
    map[row.table_name] = row.column_name;
  }

  return map;
}

export function isBooleanType(dataType: string) {
  return dataType.includes('bool');
}

export function isNumberType(dataType: string) {
  return (
    (dataType.includes('int') ||
      dataType.includes('serial') ||
      dataType.includes('double') ||
      dataType.includes('float') ||
      dataType.includes('real') ||
      dataType.includes('numeric') ||
      dataType.includes('decimal') ||
      dataType.includes('money')) &&
    dataType !== 'interval'
  );
}
