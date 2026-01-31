import { EventEmitter } from "events";

/**
 * Type-safe event emitter that supports both object and array event payloads.
 *
 * @example
 * // Define events with object payloads
 * interface MyEvents {
 *   "user:login": { userId: string };
 *   "data:loaded": { items: string[]; count: number };
 *   "error": { message: string };
 * }
 *
 * const emitter = new TypedEventEmitter<MyEvents>();
 * emitter.on("user:login", (data) => console.log(data.userId));
 * emitter.emit("user:login", { userId: "123" });
 */
export class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  private emitter = new EventEmitter();

  on<K extends keyof TEvents>(
    event: K,
    listener: (data: TEvents[K]) => void,
  ): this {
    this.emitter.on(event as string, listener as (data: unknown) => void);
    return this;
  }

  off<K extends keyof TEvents>(
    event: K,
    listener: (data: TEvents[K]) => void,
  ): this {
    this.emitter.off(event as string, listener as (data: unknown) => void);
    return this;
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): boolean {
    return this.emitter.emit(event as string, data);
  }

  once<K extends keyof TEvents>(
    event: K,
    listener: (data: TEvents[K]) => void,
  ): this {
    this.emitter.once(event as string, listener as (data: unknown) => void);
    return this;
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }
}
