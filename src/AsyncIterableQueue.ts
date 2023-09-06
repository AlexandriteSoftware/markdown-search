export interface Enqueuer<T>
{
  enqueue
    (value: T)
    : void;
}

export interface DisposableAsyncIterable<T>
  extends AsyncIterable<T>
{
  dispose()
    : void;
}

/**
 * Disposable and asynchronously iteratable queue.
 * 
 * Disposing the queue prevents further enqueuing and resolves all pending promises.
 */
export class AsyncIterableQueue<T>
  implements
  DisposableAsyncIterable<T>,
  Enqueuer<T>
{
  private readonly _values: T[] = [];
  private readonly _resolves: ((value: IteratorResult<T>) => void)[] = [];
  private readonly _dispose: () => void = () => { };
  private _disposed: boolean = false;

  constructor(dispose?: (() => void))
  {
    this._dispose = dispose || (() => { });
  }

  /**
   * Next is eigher immediatelly resolves the next value or waits for the next value to be enqueued.
   * 
   * @returns {AsyncIterator<T>}
   */
  [Symbol.asyncIterator]()
    : { next: () => Promise<IteratorResult<T>>; }
  {
    return {
      next: (): Promise<IteratorResult<T>> =>
      {
        if (this._disposed) {
          return Promise.resolve<IteratorResult<T>>(
            { done: true, value: undefined });
        }

        if (this._values.length === 0) {
          return new Promise<IteratorResult<T>>(
            resolve => this._resolves.push(resolve));
        }

        const value = this._values.shift() as T;
        return Promise.resolve<IteratorResult<T>>(
          { done: false, value });
      }
    };
  }

  dispose()
  {
    this._disposed = true;

    this._dispose();

    while (this._resolves.length > 0) {
      const resolve = this._resolves.shift() || (() => { });
      resolve({ done: true, value: undefined });
    }
  }

  enqueue
    (value: T)
  {
    if (this._disposed) {
      return;
    }

    if (this._resolves.length === 0) {
      this._values.push(value);
      return;
    }

    let resolve = this._resolves.shift() || (() => { });
    resolve({ done: false, value });
  }
}
