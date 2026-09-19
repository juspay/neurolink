import type { IncomingMessage, ServerResponse } from "node:http";

/** Node's fetch Request does not always abort when a completed upload's peer
 * disconnects before response headers. Observe the response socket as well. */
export function bindProxyClientCancellation(
  request: Request,
  bindings:
    | { incoming?: IncomingMessage; outgoing?: ServerResponse }
    | undefined,
  controller: AbortController,
): () => void {
  const abort = () =>
    controller.abort(new DOMException("Client disconnected", "AbortError"));
  const close = () => {
    if (!bindings?.outgoing?.writableFinished) {
      abort();
    }
  };
  request.signal.addEventListener("abort", abort, { once: true });
  bindings?.incoming?.once("aborted", abort);
  bindings?.outgoing?.once("close", close);
  if (
    request.signal.aborted ||
    bindings?.incoming?.aborted ||
    bindings?.outgoing?.destroyed
  ) {
    abort();
  }
  return () => {
    request.signal.removeEventListener("abort", abort);
    bindings?.incoming?.removeListener("aborted", abort);
    bindings?.outgoing?.removeListener("close", close);
  };
}
