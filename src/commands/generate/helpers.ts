import { Logger, runner as hygenRunner } from 'hygen';
import prompts from 'prompts';

import { sep } from 'path';

export async function hygenRun({
  templatesName,
  templatesPath,
  outputPath,
  templateData,
}: {
  templatesName: string;
  templatesPath: string;
  outputPath: string;
  templateData?: { [key: string]: unknown };
}) {
  const normalTemplatePath = templatesPath.endsWith(sep)
    ? templatesPath.slice(0, -1)
    : templatesPath;

  const lastSeparatorIndex = normalTemplatePath.lastIndexOf(sep);
  const templatesPathParent = normalTemplatePath.substring(0, lastSeparatorIndex);
  const templatesFolderName = normalTemplatePath.substring(lastSeparatorIndex);

  console.log(`\nGenerating files in path: ${outputPath}`);

  return hygenRunner([templatesFolderName, templatesName], {
    cwd: outputPath,
    // logger: new Logger(() => {}),
    logger: new Logger((logs: string) => {
      if (logs === '') {
        return;
      }

      console.log(logs);
    }),
    templates: templatesPathParent,
    localsDefaults: templateData,
    createPrompter: () => prompts,
  });
}
