export interface Enqueuer<T>
{
  enqueue<V extends T = T>(
      value: V
    ): void;
}

export interface DisposableAsyncIterable<T>
  extends AsyncIterable<T>
{
  dispose(
    ): void;
}

/**
 * Disposable and asynchronously iteratable queue.
 * 
 * Disposing the queue prevents further enqueuing and resolves all pending
 * promises.
 */
export class AsyncIterableQueue<T>
  implements
    DisposableAsyncIterable<T>,
    Enqueuer<T>
{
  readonly #values: T[] = [];
  readonly #resolves: ((value: IteratorResult<T>) => void)[] = [];
  readonly #dispose?: () => Promise<void>;
  #disposed: boolean = false;

  constructor(
    dispose?: () => Promise<void>)
  {
    this.#dispose = dispose;
  }

  /**
   * Next is eigher immediatelly resolves the next value or waits for the next
   * value to be enqueued.
   * 
   * @returns {AsyncIterator<T>}
   */
  [Symbol.asyncIterator](
    ): { next: () => Promise<IteratorResult<T>>; }
  {
    return {
      next: (): Promise<IteratorResult<T>> =>
      {
        if (this.#disposed) {
          return Promise.resolve<IteratorResult<T>>(
            { done: true,
              value: undefined });
        }

        if (this.#values.length === 0) {
          return new Promise<IteratorResult<T>>(
            resolve =>
              this.#resolves.push(resolve));
        }

        const value =
          this.#values.shift() as T;

        return Promise.resolve<IteratorResult<T>>(
          { done: false,
            value });
      }
    };
  }

  dispose(
    ): void
  {
    this.#disposed = true;

    this.#dispose?.();

    while (this.#resolves.length > 0) {
      const resolve =
        this.#resolves.shift();

      if (resolve) {
        resolve(
          { done: true,
            value: undefined });
      }
    }
  }

  [Symbol.dispose](
    ): void
  {
    this.dispose();
  }

  enqueue<V extends T = T>(
      value: V
    ): void
  {
    if (this.#disposed) {
      return;
    }

    if (this.#resolves.length === 0) {
      this.#values.push(value);
      return;
    }

    const resolve =
      this.#resolves.shift();

    if (resolve) {
      resolve(
        { done: false,
          value });
    }
  }
}
