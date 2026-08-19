/**
 * Shared push-based channel bridging a background producer (an agentic
 * tool-calling loop) with an async-iterable consumer. Replaces the two
 * independently-invented primitives this type unifies: the OpenAI-family
 * `createChunkQueue` (pull-based, in-band `{done:true}` sentinel) and the
 * Gemini-family `createTextChannel` (push-based, out-of-band close/error).
 */
export type StreamChannel<T = { content: string }> = {
  push(value: T): void;
  close(): void;
  error(err: unknown): void;
  readonly iterable: AsyncIterable<T>;
};
