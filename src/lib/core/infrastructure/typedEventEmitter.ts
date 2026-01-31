import { EventEmitter } from "events";

/**
 * Type-safe event emitter with strongly typed events.
 *
 * @example
 * interface MyEvents {
 *   "data": [string, number];
 *   "error": [Error];
 * }
 * const emitter = new TypedEventEmitter<MyEvents>();
 * emitter.on("data", (str, num) => { ... }); // types inferred
 */
export class TypedEventEmitter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEvents extends { [K in keyof TEvents]: any[] },
> {
  private emitter = new EventEmitter();

  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  once<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.once(
      event as string,
      listener as (...args: unknown[]) => void,
    );
    return this;
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }
}
