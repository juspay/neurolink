import { settleProxyTokenBudget } from "./proxyTokenBudget.js";
import type { ProxyTokenBudgetLease } from "../types/index.js";

/** Observe consumed bytes only: no tee, eager draining, or unbounded SSE frame. */
export function observeAnthropicBudgetResponse(
  response: Response,
  lease: ProxyTokenBudgetLease,
  onSettlement: () => void,
  signal?: AbortSignal,
): Response {
  if (lease.snapshot.scope === "disabled") {
    return response;
  }
  let finishing: Promise<void> | undefined;
  let terminalSeen = false;
  let finalOutputUsageSeen = false;
  let logicalFailureSeen = false;
  let input: number | undefined;
  let output: number | undefined;
  let cachedRead = 0;
  let cachedWrite = 0;
  let pending = "";
  let oversized = false;
  const isSse = response.headers
    .get("content-type")
    ?.includes("text/event-stream");
  const decoder = new TextDecoder();
  const readUsage = (text: string): void => {
    try {
      const event = JSON.parse(text);
      if (event?.type === "message_stop") {
        terminalSeen = true;
      }
      if (event?.type === "error") {
        logicalFailureSeen = true;
      }
      const usage = event?.usage ?? event?.message?.usage;
      if (!usage || typeof usage !== "object") {
        return;
      }
      const valid = (n: unknown): n is number =>
        typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
      if (valid(usage.input_tokens)) {
        input = Math.max(input ?? 0, usage.input_tokens);
      }
      if (valid(usage.output_tokens)) {
        if (event?.type === "message_delta") {
          finalOutputUsageSeen = true;
        }
        output = Math.max(output ?? 0, usage.output_tokens);
      }
      if (valid(usage.cache_read_input_tokens)) {
        cachedRead = Math.max(cachedRead, usage.cache_read_input_tokens);
      }
      if (valid(usage.cache_creation_input_tokens)) {
        cachedWrite = Math.max(cachedWrite, usage.cache_creation_input_tokens);
      }
    } catch {
      /* Incomplete/oversized frames keep the conservative reservation. */
    }
  };
  const observe = (text: string): void => {
    if (!isSse) {
      if (!oversized && pending.length + text.length <= 1024 * 1024) {
        pending += text;
      } else {
        oversized = true;
        pending = "";
      }
      return;
    }
    // Split large chunks without retaining a large frame between pulls.
    for (const part of text.split(/(?<=\n)/u)) {
      if (!oversized && pending.length + part.length <= 64 * 1024) {
        pending += part;
      } else {
        oversized = true;
        pending = "";
      }
      if (part.endsWith("\n")) {
        if (!oversized && pending.startsWith("data:")) {
          readUsage(pending.slice(5).trim());
        }
        pending = "";
        oversized = false;
      }
    }
  };
  const finish = (normal: boolean): Promise<void> => {
    if (finishing) {
      return finishing;
    }
    finishing = (async () => {
      signal?.removeEventListener("abort", onAbort);
      if (normal) {
        observe(decoder.decode());
        if (!oversized && pending) {
          readUsage(
            isSse && pending.startsWith("data:")
              ? pending.slice(5).trim()
              : pending,
          );
        }
      }
      const actual =
        normal &&
        !logicalFailureSeen &&
        (!isSse || (terminalSeen && finalOutputUsageSeen)) &&
        input !== undefined &&
        output !== undefined
          ? input + output + cachedRead + cachedWrite
          : undefined;
      try {
        await settleProxyTokenBudget(lease, actual);
      } finally {
        onSettlement();
      }
    })();
    return finishing;
  };
  const onAbort = (): void => {
    void finish(false).catch(() => undefined);
  };
  if (signal?.aborted) {
    onAbort();
  } else {
    signal?.addEventListener("abort", onAbort, { once: true });
  }
  if (!response.body) {
    void finish(false).catch(() => undefined);
    return response;
  }
  const reader = response.body.getReader();
  return new Response(
    new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            const next = await reader.read();
            if (next.done) {
              await finish(true);
              controller.close();
              return;
            }
            observe(decoder.decode(next.value, { stream: true }));
            controller.enqueue(next.value);
          } catch (error) {
            await finish(false).catch(() => undefined);
            controller.error(error);
          }
        },
        async cancel(reason) {
          await Promise.allSettled([reader.cancel(reason), finish(false)]);
        },
      },
      { highWaterMark: 0 },
    ),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },
  );
}
