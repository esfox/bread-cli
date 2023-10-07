import { Logger, runner as hygenRunner } from 'hygen';
import prompts from 'prompts';

import { execSync } from 'child_process';
import { join, sep } from 'path';

export async function hygenRun({
  templatesPath,
  outputPath,
  templatesName,
  templateData,
}: {
  templatesPath: string;
  outputPath: string;
  templatesName?: string;
  templateData?: { [key: string]: unknown };
}) {
  const normalTemplatePath = templatesPath.endsWith(sep)
    ? templatesPath.slice(0, -1)
    : templatesPath;

  let lastSeparatorIndex = normalTemplatePath.lastIndexOf(sep);
  let templatesPathParent = normalTemplatePath.substring(0, lastSeparatorIndex);
  let templatesFolder = normalTemplatePath.substring(lastSeparatorIndex + 1);

  console.log(`\nGenerating files in path: ${outputPath}`);

  let templatesSubfolder = templatesName;
  if (!templatesSubfolder) {
    templatesSubfolder = templatesFolder;

    lastSeparatorIndex = templatesPathParent.lastIndexOf(sep);
    templatesFolder = templatesPathParent.substring(lastSeparatorIndex + 1);
    templatesPathParent = templatesPathParent.substring(0, lastSeparatorIndex);
  }

  return hygenRunner([templatesFolder, templatesSubfolder], {
    cwd: outputPath,
    // logger: new Logger(() => {}),
    logger: new Logger((logs: string) => {
      const log = logs.replace(templatesPathParent, templatesPath);
      if (log === '') {
        return;
      }

      console.log(log);
    }),
    templates: templatesPathParent,
    localsDefaults: templateData,
    createPrompter: () => prompts,
  });
}

export function formatCodeInFolder(folder: string) {
  const glob = join(folder, '**', '*');
  try {
    execSync(`prettier --write --ignore-unknown '${glob}'`);
  } catch (error) {
    /* ignore error */
  }
}
