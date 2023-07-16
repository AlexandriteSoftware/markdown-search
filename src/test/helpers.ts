export function waitFor(predicate: () => boolean, timeout: number) : Promise<void> {
  if (predicate()) {
    return Promise.resolve();
  }

  const start = Date.now();
  return new Promise((resolve, reject) => {
    let interval: NodeJS.Timer | null = null;
    interval = setInterval(() => {
      if (Date.now() - start > timeout) {
        if (interval !== null) {
          clearInterval(interval);
        }
        reject(new Error('Timeout'));
        return;
      }

      if (predicate()) {
        if (interval !== null) {
          clearInterval(interval);
        }
        resolve();
      }
    }, 20);
  });
}
