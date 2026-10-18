/**
 * Request-body ceiling for the proxy's POST routes.
 *
 * The body is read before anything else about the request is known (the model,
 * the share token), so it is bounded first, chunk by chunk, the way the server
 * adapters bound theirs. Each route gets the request size limit its API
 * documents; one environment variable overrides all of them.
 *
 * @module proxy/requestBodyLimit
 */

import {
  RawBodyTooLargeError,
  readBoundedRequestBody,
  tryParseByteLimit,
} from "../server/utils/rawBody.js";
import { logger } from "../utils/logger.js";

/**
 * Environment variable that sets the ceiling for every POST route, replacing
 * the per-route defaults below: a byte count, or `64mb` / `512kb` / `1gb`.
 */
export const PROXY_MAX_REQUEST_BODY_ENV =
  "NEUROLINK_PROXY_MAX_REQUEST_BODY_BYTES";

const MIB = 1024 * 1024;

/**
 * 32 MiB. The Claude Messages API and Token Counting API document a 32 MB
 * maximum request size and answer a larger request with 413 `request_too_large`:
 * https://platform.claude.com/docs/en/api/errors#request-size-limits
 *
 * Also the limit for a POST route with no upstream API of its own (the peer
 * endpoints), which has nothing documented to follow.
 */
export const DEFAULT_PROXY_MAX_REQUEST_BODY_BYTES = 32 * MIB;

/**
 * 100 MiB. The Gemini API documents inline data as "100 MB per request or
 * payload (50 MB for PDFs)":
 * https://ai.google.dev/gemini-api/docs/file-input-methods
 */
export const GEMINI_PROXY_MAX_REQUEST_BODY_BYTES = 100 * MIB;

/**
 * 64 MiB. A local cap, not an OpenAI figure: OpenAI documents no general
 * request-body limit for the Responses or Chat Completions APIs. The only
 * per-request payload figure it states is the image input requirement, "Up to
 * 512 MB total payload per request":
 * https://developers.openai.com/api/docs/guides/images-vision
 * (file inputs are separately limited to 50 MB combined:
 * https://developers.openai.com/api/docs/guides/file-inputs). The proxy holds
 * a body in memory while it reads it, about four times its size, so it does
 * not take the 512 MB figure as its ceiling; a client that sends more raises
 * `NEUROLINK_PROXY_MAX_REQUEST_BODY_BYTES`. The Codex route speaks the
 * Responses format and documents nothing of its own, so it uses the same cap.
 */
export const OPENAI_PROXY_MAX_REQUEST_BODY_BYTES = 64 * MIB;

/**
 * Registered route path (a suffix, so a base path does not matter) to limit.
 * The first match wins; no match means the default above.
 */
const ROUTE_LIMITS: ReadonlyArray<readonly [RegExp, number]> = [
  [/\/v1\/messages(?:\/count_tokens)?$/, DEFAULT_PROXY_MAX_REQUEST_BODY_BYTES],
  [/\/v1\/chat\/completions$/, OPENAI_PROXY_MAX_REQUEST_BODY_BYTES],
  [/\/backend-api\/codex\/responses$/, OPENAI_PROXY_MAX_REQUEST_BODY_BYTES],
  [/\/v1beta\/models\/[^/]+$/, GEMINI_PROXY_MAX_REQUEST_BODY_BYTES],
];

let warnedAbout: string | undefined;

/**
 * The ceiling in bytes for one route: the environment override when it is a
 * positive size, else that route's documented limit.
 *
 * @param routePath - The route as registered, for example `/v1/messages`.
 */
export function resolveProxyMaxRequestBodyBytes(
  routePath: string,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[PROXY_MAX_REQUEST_BODY_ENV]?.trim();
  if (raw) {
    const parsed = tryParseByteLimit(raw);
    if (parsed !== undefined && parsed > 0) {
      return parsed;
    }
    if (warnedAbout !== raw) {
      warnedAbout = raw;
      logger.always(
        `[proxy] ignoring ${PROXY_MAX_REQUEST_BODY_ENV}=${JSON.stringify(raw)}: expected a positive byte count or a size such as 64mb; using each route's documented limit`,
      );
    }
  }
  return (
    ROUTE_LIMITS.find(([pattern]) => pattern.test(routePath))?.[1] ??
    DEFAULT_PROXY_MAX_REQUEST_BODY_BYTES
  );
}

/**
 * The request body as text, `undefined` when it cannot be read (a client that
 * hung up mid-body), or the error when it is over the route's ceiling. Over the
 * ceiling the stream is cancelled, so nothing past it is buffered.
 *
 * @param routePath - The route as registered, for example `/v1/messages`.
 */
export async function readProxyRequestText(
  request: Request,
  routePath: string,
  env: Record<string, string | undefined> = process.env,
): Promise<string | undefined | RawBodyTooLargeError> {
  try {
    const bytes = await readBoundedRequestBody(
      request,
      resolveProxyMaxRequestBodyBytes(routePath, env),
    );
    return bytes instanceof RawBodyTooLargeError
      ? bytes
      : new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}
