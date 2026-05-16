/**
 * mockFetch — Route-based interceptor for `globalThis.fetch`.
 *
 * Replaces the global fetch with a route table that matches on (method, url
 * substring | regex) and returns a canned `Response`. Captures every call so
 * tests can assert the request URL / body / headers the provider actually
 * sent — proving the *contract* (request shape + auth + response parse +
 * error mapping) without burning real API quota.
 *
 * Usage:
 *
 *   const { unset, calls } = installMockFetch([
 *     {
 *       method: "POST",
 *       url: "api.x.ai/v1/chat/completions",
 *       respond: { status: 200, json: { choices: [{ message: { content: "pong" } }] } },
 *     },
 *   ]);
 *   try {
 *     await nl.generate({ provider: "xai", input: { text: "ping" } });
 *     assertEq(calls[0].method, "POST");
 *   } finally {
 *     unset();
 *   }
 */

type RespondSpec = {
  status?: number;
  json?: unknown;
  text?: string;
  bytes?: Uint8Array;
  contentType?: string;
  headers?: Record<string, string>;
};

type CapturedCall = {
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyJson: unknown;
};

type Route = {
  /** "POST" | "GET" | "PUT" — match on method (case-insensitive). Omit to match any. */
  method?: string;
  /** Substring or regex applied to the URL. */
  url: string | RegExp;
  /** Static response, or a function that builds one from the captured call. */
  respond:
    | RespondSpec
    | ((call: CapturedCall) => RespondSpec | Promise<RespondSpec>);
};

export type MockFetchHandle = {
  unset(): void;
  calls: CapturedCall[];
};

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return (input as Request).url;
}

function headersToObject(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) {
    return out;
  }
  if (h instanceof Headers) {
    h.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) {
      out[k.toLowerCase()] = v;
    }
    return out;
  }
  for (const [k, v] of Object.entries(h)) {
    out[k.toLowerCase()] = String(v);
  }
  return out;
}

function bodyToText(body: BodyInit | null | undefined): string {
  if (body === undefined || body === null) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf8");
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body).toString("utf8");
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  // FormData / Blob / ReadableStream — best-effort skip
  return "";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function buildResponse(spec: RespondSpec): Response {
  const status = spec.status ?? 200;
  if (spec.bytes !== undefined) {
    const headers = new Headers({
      "Content-Type": spec.contentType ?? "application/octet-stream",
      ...(spec.headers ?? {}),
    });
    return new Response(spec.bytes, { status, headers });
  }
  if (spec.json !== undefined) {
    const headers = new Headers({
      "Content-Type": spec.contentType ?? "application/json",
      ...(spec.headers ?? {}),
    });
    return new Response(JSON.stringify(spec.json), { status, headers });
  }
  if (spec.text !== undefined) {
    const headers = new Headers({
      "Content-Type": spec.contentType ?? "text/plain",
      ...(spec.headers ?? {}),
    });
    return new Response(spec.text, { status, headers });
  }
  return new Response("", { status });
}

export function installMockFetch(routes: Route[]): MockFetchHandle {
  const original = globalThis.fetch;
  const calls: CapturedCall[] = [];

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = urlOf(input);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const headers = headersToObject(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const bodyText = bodyToText(init?.body);
    const bodyJson = safeJson(bodyText);

    const call: CapturedCall = { method, url, headers, bodyText, bodyJson };
    calls.push(call);

    for (const route of routes) {
      const methodOk = !route.method || route.method.toUpperCase() === method;
      const urlOk =
        typeof route.url === "string"
          ? url.includes(route.url)
          : route.url.test(url);
      if (methodOk && urlOk) {
        const spec =
          typeof route.respond === "function"
            ? await route.respond(call)
            : route.respond;
        return buildResponse(spec);
      }
    }

    throw new Error(
      `[mockFetch] No route matched ${method} ${url}\n` +
        `  Available routes:\n` +
        routes
          .map(
            (r) =>
              `    - ${r.method ?? "ANY"} ${r.url instanceof RegExp ? r.url.source : r.url}`,
          )
          .join("\n"),
    );
  }) as typeof fetch;

  return {
    calls,
    unset: () => {
      globalThis.fetch = original;
    },
  };
}

/**
 * Lightweight in-suite test helpers (no Jest / Vitest dependency).
 */

export type TestRecord = { name: string; ok: boolean; reason?: string };

export function record(
  results: TestRecord[],
  name: string,
  ok: boolean,
  reason?: string,
): void {
  results.push({ name, ok, reason });
  console.log(`${ok ? "✓" : "✗"} ${name}${reason ? ` — ${reason}` : ""}`);
}

export function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`expect failed: ${message}`);
  }
}

export function expectEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `expect ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
