import { EventEmitter } from "events";

export class TypedEventEmitter<TEvents extends Record<string, unknown[]>> {
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
