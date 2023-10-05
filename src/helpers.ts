export function exitAfter(fn: () => unknown) {
  return async () => {
    await fn();
    process.exit();
  };
}
