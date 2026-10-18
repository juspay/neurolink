/**
 * Client image references on the proxy's translation routes, vetted before the
 * SDK sees them.
 *
 * The OpenAI, Gemini and (once a model is routed or falls back to another
 * provider) Claude routes copy whatever a client put in an image slot into
 * `input.images`, and the SDK resolves a string itself: an `http(s)` URL is
 * fetched with redirects followed and no address check, and anything else that
 * names an existing file is read from the local disk. Both suit a program that
 * names its own files. Neither suits a request that arrived over a socket.
 *
 * So the proxy resolves every reference itself and hands the SDK nothing but
 * `data:` URIs and downloaded bytes:
 *   - `data:` URIs pass through untouched, they carry their own content;
 *   - `https://` URLs are downloaded with the same helper the agent routes use
 *     (`resolveAgentInput` -> `safeDownload`): redirects refused, addresses
 *     checked, size capped;
 *   - everything else (local paths, `http://`, `file://`, any other scheme) is
 *     refused before the file system or the network is touched, so the answer
 *     for a path that exists and one that does not is the same.
 *
 * Unlike the agent routes there is no allowed-roots setting: the proxy listens
 * on loopback without credentials by default, and a path allow-list on a server
 * with no caller identity would still hand its owner's disk to every local
 * process, and to every holder of a share token. Local paths are refused
 * outright.
 *
 * Count and size are bounded as the agent routes bound them: at most 20 images,
 * each at most 50 MB, all together at most 100 MB, with a `data:` URI charged
 * its string length.
 *
 * The refusal is a {@link ProxyContextPreflightError}, so every site that
 * already answers a local admission refusal (400, no retry, no fallback) answers
 * this one in the client's own error format.
 *
 * @module proxy/proxyImageInput
 */

import {
  AgentInputError,
  resolveAgentInput,
} from "../server/utils/agentInput.js";
import { logger } from "../utils/logger.js";
import { ProxyContextPreflightError } from "./proxyContextPreflight.js";

const INVALID_REFERENCE_MESSAGE =
  "Image references must be data: URIs or public https URLs. Local file paths, http URLs and other schemes are not accepted by this proxy.";

const UNFETCHABLE_URL_MESSAGE =
  "An image URL could not be fetched. It must be a public https URL, answer without a redirect and fit the size limit.";

/** An image reference the proxy refuses; answers 400 in the client's format. */
export class ProxyImageInputError extends ProxyContextPreflightError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ProxyImageInputError";
  }
}

const isDataUri = (entry: string): boolean => entry.startsWith("data:");

const isHttpsUrl = (entry: string): boolean => /^https:\/\//i.test(entry);

/**
 * What kind of reference was refused, for the operator's log. The reference
 * itself is never logged: it can be a server path, or a URL with credentials.
 */
function describeRefusal(entry: unknown): string {
  if (typeof entry !== "string") {
    return "non-string";
  }
  if (/^https?:\/\//i.test(entry)) {
    return "http-url";
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]+:/.test(entry)) {
    return "other-scheme";
  }
  return "path";
}

function refuseReference(entry: unknown): ProxyImageInputError {
  logger.warn("[proxy] refused a client image reference", {
    kind: describeRefusal(entry),
  });
  return new ProxyImageInputError(
    "invalid_image_reference",
    INVALID_REFERENCE_MESSAGE,
  );
}

function asProxyImageInputError(error: unknown): unknown {
  if (!(error instanceof AgentInputError)) {
    return error;
  }
  // agentInput's messages name a limit, never the input, so the size and count
  // refusals pass through. Its download refusal is already logged there.
  if (error.status === 413) {
    return new ProxyImageInputError("image_input_too_large", error.message);
  }
  return new ProxyImageInputError(
    "image_url_unfetchable",
    UNFETCHABLE_URL_MESSAGE,
  );
}

/**
 * Resolve one list of client image references to what the SDK may be given.
 *
 * `signal` cancels the work: a download in flight is aborted and no further
 * reference is started. A cancellation rejects with the signal's own error, not
 * with a {@link ProxyImageInputError}, since nothing was refused.
 *
 * @throws {ProxyImageInputError} for the first reference that is refused, or
 *   for a list that carries too many images or too many bytes.
 */
export async function vetProxyImages(
  images: readonly unknown[],
  signal?: AbortSignal,
): Promise<Array<string | Buffer>> {
  const references: string[] = [];
  for (const entry of images) {
    if (typeof entry !== "string" || !(isDataUri(entry) || isHttpsUrl(entry))) {
      throw refuseReference(entry);
    }
    references.push(entry);
  }
  try {
    const resolved = await resolveAgentInput(
      { text: "", images: references },
      { signal },
    );
    return resolved.images ?? [];
  } catch (error) {
    throw asProxyImageInputError(error);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The `input.images` list of an SDK options object, when it has one. */
function imagesOf(body: object): readonly unknown[] | undefined {
  const input: unknown = Reflect.get(body, "input");
  return isRecord(input) && Array.isArray(input.images)
    ? input.images
    : undefined;
}

/**
 * Per-request holder of vetted images.
 *
 * A translated request can make several attempts, each handing the SDK the same
 * references, so each reference is resolved once and looked up by its text
 * afterwards. `apply` fails closed: a list that carries a reference `vet` has
 * not seen is refused, never forwarded.
 */
export function createProxyImageVetter() {
  const resolved = new Map<string, string | Buffer>();

  return {
    /**
     * Vet the images `body` would hand the SDK that no earlier call vetted.
     * `signal` cancels downloads still running; see {@link vetProxyImages}.
     */
    async vet(body: object, signal?: AbortSignal): Promise<void> {
      const pending = (imagesOf(body) ?? []).filter(
        (entry) => typeof entry !== "string" || !resolved.has(entry),
      );
      if (pending.length === 0) {
        return;
      }
      const vetted = await vetProxyImages(pending, signal);
      pending.forEach((entry, index) => {
        if (typeof entry === "string") {
          resolved.set(entry, vetted[index]);
        }
      });
    },

    /** `body` with its `input.images` replaced by the vetted content. */
    apply<T extends object>(body: T): T {
      const input: unknown = Reflect.get(body, "input");
      const images = imagesOf(body);
      if (!isRecord(input) || images === undefined) {
        return body;
      }
      return {
        ...body,
        input: {
          ...input,
          images: images.map((entry) => {
            const vetted =
              typeof entry === "string" ? resolved.get(entry) : undefined;
            if (vetted === undefined) {
              throw refuseReference(entry);
            }
            return vetted;
          }),
        },
      };
    },
  };
}
