import { Searcher } from 'fast-fuzzy';
import { globSync } from 'fast-glob';
import { Choice } from 'prompts';

export function getDirectoriesInCwd() {
  const directories = globSync(['./**/*'], {
    ignore: ['node_modules'],
    onlyDirectories: true,
    suppressErrors: true,
    cwd: process.cwd(),
  }).sort();

  directories.unshift('.');
  return directories;
}

export function getAutocompleteFuzzySuggest() {
  return (input: string, choices: Choice[]) => {
    if (!input) {
      return Promise.resolve(choices);
    }

    const searcher = new Searcher(choices, {
      ignoreCase: true,
      keySelector: (item) => item.title,
    });

    const result = searcher.search(input);
    return Promise.resolve(result);
  };
}
