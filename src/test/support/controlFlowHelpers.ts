export function waitFor(
    predicate: () => boolean,
    timeout: number
  ): Promise<void>
{
  if (predicate()) {
    return Promise.resolve();
  }

  const start = Date.now();

  return new Promise(
    (resolve, reject) =>
    {
      let interval: NodeJS.Timeout | null = null;

      interval =
        setInterval(
          () => {
            const elapsed =
              Date.now() - start;

            if (elapsed > timeout) {
              if (interval !== null) {
                clearInterval(interval);
                interval = null;
              }

              reject(
                new Error(
                  'Timeout'));

              return;
            }

            if (predicate()) {
              if (interval !== null) {
                clearInterval(interval);
                interval = null;
              }

              resolve();
            }
          },
          20);
    });
}

export async function retry<T>(
    fn: () => Promise<T>,
    retries = 5,
    delay = 1000
  ): Promise<T>
{
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }

    console.log(err);

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          delay));

    return await retry(
      fn,
      retries - 1,
      delay);
  }
}
