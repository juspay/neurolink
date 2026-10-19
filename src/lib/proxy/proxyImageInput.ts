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
 * images it has checked:
 *   - `data:` URIs carry their own content. The payload is decoded strictly (an
 *     alphabet, length or padding no decoder takes is refused) and its leading
 *     bytes must be a recognised image, whatever the URI says it is. The SDK is
 *     handed `data:<detected type>;base64,<standard payload>`: the type comes
 *     from the bytes, never from the client, so a JPEG labelled `image/png`
 *     reaches the provider as `image/jpeg`;
 *   - `https://` URLs are downloaded with the same helper the agent routes use
 *     (`resolveAgentInput` -> `safeDownload`): redirects refused, addresses
 *     checked, size capped. The bytes must then be a recognised image too, or
 *     the URL is refused, so a page that answers `200 text/html` is never sent
 *     on as a picture. The SDK reads the type of those bytes itself, from the
 *     same signatures;
 *   - everything else (local paths, `http://`, `file://`, any other scheme, an
 *     empty string) is refused before the file system or the network is
 *     touched, so the answer for a path that exists and one that does not is the
 *     same.
 *
 * An image slot that carries nothing is refused too, never skipped. The doors
 * hand over what the client sent: an empty `data:` payload (an OpenAI
 * `data:image/png;base64,`, a Claude `base64` source or a Gemini `inlineData`
 * of an image type whose `data` is empty or absent) is `invalid_image_data`, and
 * an empty URL (an OpenAI `image_url.url` or a Claude `url` source) is
 * `invalid_image_reference`.
 *
 * "A recognised image" is a file signature (`sniffInputImageMimeType`): PNG,
 * JPEG, WebP and GIF, which every provider takes, and HEIC, HEIF, AVIF, BMP,
 * TIFF, ICO and JPEG 2000, which no provider except Google (HEIC and HEIF only)
 * takes. The SDK tries to convert those seven to PNG before dispatch, for every
 * provider, Google included; when neither sharp nor ffmpeg can read the file it
 * sends the original bytes under the detected type. SVG is markup and is
 * refused. Nothing in the proxy decodes the picture: a body that is corrupt
 * after a valid signature is the provider's to refuse.
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
import { sniffInputImageMimeType } from "../utils/imageDetection.js";
import { logger } from "../utils/logger.js";
import { ProxyContextPreflightError } from "./proxyContextPreflight.js";

const INVALID_REFERENCE_MESSAGE =
  "Image references must be data: URIs or public https URLs. Local file paths, http URLs and other schemes are not accepted by this proxy.";

const UNFETCHABLE_URL_MESSAGE =
  "An image URL could not be fetched. It must be a public https URL, answer without a redirect and fit the size limit.";

const INVALID_IMAGE_DATA_MESSAGE =
  "An inline image is not a recognised image. Send the bytes of a PNG, JPEG, WebP, GIF, HEIC, HEIF, AVIF, BMP, TIFF, ICO or JPEG 2000 image as base64, in a data: URI.";

const INVALID_URL_CONTENT_MESSAGE =
  "An image URL did not serve a recognised image. It must serve the bytes of a PNG, JPEG, WebP, GIF, HEIC, HEIF, AVIF, BMP, TIFF, ICO or JPEG 2000 image.";

/**
 * Base64 characters sufficient for the longest signature probe: every format is
 * recognised within its first few dozen bytes, and an ISO-BMFF `ftyp` box can
 * list brands for a little longer. A multiple of four, so the prefix of a longer
 * payload decodes without padding.
 */
const SNIFF_BASE64_CHARS = 1024;

/** The longest `data:...;base64` header taken for one; a longer one is no header. */
const MAX_DATA_URI_HEADER_CHARS = 256;

/** Standard or URL-safe base64, the two alphabets Google's JSON `bytes` fields accept. */
const BASE64_TEXT = /^[A-Za-z0-9+/_-]+={0,2}$/;

/**
 * `data` as padded standard-alphabet base64, which is what a `data:` URI carries,
 * or undefined when it is not well-formed base64.
 *
 * The SDK forwards the base64 text of a `data:` URI to the provider as it is, so
 * a URL-safe or unpadded payload would reach a provider that expects neither.
 * The alphabet check alone lets through a payload no decoder takes: one
 * character over a multiple of four is no base64 length at all, and padding
 * must be exactly what the length calls for. An empty string is not base64.
 *
 * One rule for every door: the Gemini parser applies it before wrapping raw
 * `inlineData`, and the vetter applies it again to every `data:` URI it is given.
 */
export function toStandardBase64(data: string): string | undefined {
  if (!BASE64_TEXT.test(data)) {
    return undefined;
  }
  const standard = /[-_]/.test(data)
    ? data.replace(/-/g, "+").replace(/_/g, "/")
    : data;
  const body = standard.replace(/=+$/, "");
  const padding = standard.length - body.length;
  const missing = (4 - (body.length % 4)) % 4;
  if (missing === 3 || (padding > 0 && padding !== missing)) {
    return undefined;
  }
  return `${body}${"=".repeat(missing)}`;
}

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
  if (entry === "") {
    return "empty";
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

/**
 * `reason` names which check failed, for the operator's log; the data itself is
 * never logged, nor echoed to the client.
 */
function refuseImageData(
  reason: string,
  message: string = INVALID_IMAGE_DATA_MESSAGE,
): ProxyImageInputError {
  logger.warn("[proxy] refused image bytes that are not a recognised image", {
    reason,
  });
  return new ProxyImageInputError("invalid_image_data", message);
}

/** A declared type safe to put in a log line; anything else is `malformed`. */
const loggableType = (declared: string): string =>
  declared.length <= 64 && /^[\w./+-]*$/.test(declared)
    ? declared.toLowerCase()
    : "malformed";

/**
 * Check one `data:` URI and return it as `data:<detected type>;base64,<payload>`.
 *
 * The header's parameters and declared type are discarded: the type is read
 * from the decoded bytes. Only the leading bytes are decoded to find it; the
 * rest of the payload has been checked as base64 text and is forwarded as is.
 *
 * @throws {ProxyImageInputError} `invalid_image_data` when the URI is not a
 *   base64 data URI, its payload is empty or not strict base64, or its bytes are
 *   not a recognised image.
 */
function verifyInlineImage(entry: string): string {
  const comma = entry.indexOf(",");
  if (comma === -1 || comma > MAX_DATA_URI_HEADER_CHARS) {
    throw refuseImageData("data-uri-shape");
  }
  const header = entry.slice("data:".length, comma);
  if (!/;base64$/i.test(header)) {
    throw refuseImageData("data-uri-shape");
  }
  if (comma + 1 === entry.length) {
    throw refuseImageData("empty-payload");
  }
  const payload = toStandardBase64(entry.slice(comma + 1));
  if (payload === undefined) {
    throw refuseImageData("not-base64");
  }
  const detected = sniffInputImageMimeType(
    Buffer.from(payload.slice(0, SNIFF_BASE64_CHARS), "base64"),
  );
  if (detected === null) {
    throw refuseImageData("not-an-image");
  }
  const declared = header.slice(0, header.indexOf(";"));
  if (declared.toLowerCase() !== detected) {
    logger.debug("[proxy] corrected the declared type of an inline image", {
      declared: loggableType(declared),
      detected,
    });
  }
  return `data:${detected};base64,${payload}`;
}

/** The bytes of a downloaded image, or a refusal when they are not one. */
function verifyDownloadedImage(bytes: Buffer): Buffer {
  if (sniffInputImageMimeType(bytes) === null) {
    throw refuseImageData("url-content", INVALID_URL_CONTENT_MESSAGE);
  }
  return bytes;
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
 * Resolve one list of client image references to what the SDK may be given:
 * `data:` URIs rewritten to carry the type their bytes have, and downloaded
 * bytes that are an image.
 *
 * Inline images are judged before anything is downloaded, so a request already
 * doomed by one costs no network. Size and count are judged on the `data:` URIs
 * as the client sent them (their string length), then on the downloads (their
 * bytes), exactly as the agent routes judge them.
 *
 * `signal` cancels the work: a download in flight is aborted and no further
 * reference is started. A cancellation rejects with the signal's own error, not
 * with a {@link ProxyImageInputError}, since nothing was refused.
 *
 * @throws {ProxyImageInputError} for the first reference that is refused
 *   (`invalid_image_reference`, `invalid_image_data`, `image_url_unfetchable`),
 *   or for a list that carries too many images or too many bytes
 *   (`image_input_too_large`).
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
  const inline = references.map((entry) =>
    isDataUri(entry) ? verifyInlineImage(entry) : undefined,
  );
  try {
    // The client's own strings are what is measured against the limits; the
    // rewritten ones replace them afterwards.
    const resolved = await resolveAgentInput(
      { text: "", images: references },
      { signal },
    );
    return (resolved.images ?? []).map((item, index) => {
      const verified = inline[index];
      if (verified !== undefined) {
        return verified;
      }
      if (typeof item === "string") {
        throw refuseReference(item);
      }
      return verifyDownloadedImage(item);
    });
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
