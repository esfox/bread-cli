import { globSync } from 'fast-glob';

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
