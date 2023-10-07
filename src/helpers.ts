/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function exitAfter(fn: (...args: any[]) => unknown) {
  return async (...args: any[]) => {
    await fn(...args);
    process.exit();
  };
}
