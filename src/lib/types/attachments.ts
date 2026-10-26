/**
 * Attachment ingestion policy — the SDK-level counterpart of the server's
 * default-deny path roots and SSRF guard.
 *
 * Every loader that turns a caller-supplied string into bytes (image URLs and
 * paths in `input.images`, entries of `input.files`, `rag.files`,
 * `transcribe({ audio })`, Director Mode segment images, `WebLoader`) reads
 * its limits from one {@link AttachmentPolicy}. The policy is resolved once
 * per `NeuroLink` instance from {@link AttachmentsConfig} and the
 * `NEUROLINK_ATTACHMENT_*` environment variables, then stamped onto each
 * call's options so the loaders several hops down see the same answer.
 *
 * Runtime helpers live in `src/lib/utils/attachmentPolicy.ts`.
 */

/**
 * `new NeuroLink({ attachments })` — what an instance may read or fetch on a
 * caller's behalf.
 *
 * Every field also has an environment variable for deployments that cannot
 * change constructor arguments (the CLI, containers). An explicit field wins
 * over its variable.
 *
 * | Field | Environment variable | Default |
 * | --- | --- | --- |
 * | `allowedRoots` | `NEUROLINK_ATTACHMENT_ROOTS` (path-list, `:`/`;` separated) | unrestricted (warns once) |
 * | `allowInsecureUrls` | `NEUROLINK_ATTACHMENT_ALLOW_INSECURE_URLS=1` | `false` |
 * | `allowPrivateNetwork` | `NEUROLINK_ATTACHMENT_ALLOW_PRIVATE_NETWORK=1` | `false` |
 * | `followRedirects` | `NEUROLINK_ATTACHMENT_FOLLOW_REDIRECTS=0` | `true` |
 * | `maxBytes` | `NEUROLINK_ATTACHMENT_MAX_BYTES` | each loader's own cap |
 */
export type AttachmentsConfig = {
  /**
   * Directories a local file path may resolve into. Containment is checked on
   * the real (symlink-resolved) path of both the root and the target, and the
   * file is opened `O_NOFOLLOW` on that real path, so a symlink planted under
   * a root cannot reach outside it. Unset means any readable file — the
   * pre-hardening behaviour — and the SDK warns once per process when it
   * reads a path without roots. A host that forwards strings from untrusted
   * callers must set this.
   */
  allowedRoots?: string[];
  /**
   * Accept `http://` attachment URLs. Default `false`: plain HTTP carries the
   * bytes — and any credentials on the request — in the clear, and is the
   * transport every loopback and link-local target answers on.
   */
  allowInsecureUrls?: boolean;
  /**
   * Fetch URLs whose host is, or resolves to, a loopback, RFC 1918,
   * link-local, CGNAT, multicast or cloud-metadata address. Default `false`.
   * The connection is still pinned to the resolved addresses.
   */
  allowPrivateNetwork?: boolean;
  /**
   * Follow HTTP redirects (up to five hops). Default `true`. Every hop is
   * re-validated against the same URL policy, and caller-supplied headers
   * (`authHeaders`) are never sent to a redirect target.
   */
  followRedirects?: boolean;
  /**
   * Upper bound, in bytes, for any single attachment read or download. A
   * loader's own cap still applies when it is lower.
   */
  maxBytes?: number;
};

/**
 * The resolved, immutable form of {@link AttachmentsConfig} that the loaders
 * consume. `allowedRoots` holds absolute paths; `undefined` means unrestricted.
 */
export type AttachmentPolicy = {
  readonly kind: "neurolink-attachment-policy";
  readonly allowedRoots: readonly string[] | undefined;
  readonly allowInsecureUrls: boolean;
  readonly allowPrivateNetwork: boolean;
  readonly followRedirects: boolean;
  readonly maxBytes: number | undefined;
};

/** Options for `downloadAttachment()`. */
export type AttachmentDownloadOptions = {
  /** Policy to apply; the environment-derived default when omitted. */
  policy?: AttachmentPolicy;
  /** Hard cap on the response body in bytes (the policy's `maxBytes` lowers it). */
  maxBytes: number;
  /** Short label for error messages, e.g. `"image URL"`. */
  label: string;
  /**
   * Headers for the first request only. They are dropped on every redirect
   * hop so a credential meant for one host never reaches another.
   */
  headers?: Record<string, string>;
  /** Transfer timeout in milliseconds. */
  timeoutMs?: number;
  /** Caller cancellation. */
  signal?: AbortSignal;
  /** `HEAD` fetches headers only and returns an empty body. */
  method?: "GET" | "HEAD";
};

/** Options for `readAttachmentFile()`. */
export type AttachmentReadOptions = {
  /** Policy to apply; the environment-derived default when omitted. */
  policy?: AttachmentPolicy;
  /** Hard cap on the file size in bytes (the policy's `maxBytes` lowers it). */
  maxBytes: number;
  /** Short label for error messages, e.g. `"image file"`. */
  label: string;
};

/** What `readAttachmentFile()` returns. */
export type AttachmentReadResult = {
  buffer: Buffer;
  /** The symlink-resolved path that was actually opened. */
  realPath: string;
};

/**
 * Machine-readable reasons an attachment was refused. Carried as `code` on the
 * thrown error so callers can map them without parsing messages.
 */
export type AttachmentRefusalCode =
  | "ATTACHMENT_OUTSIDE_ROOTS"
  | "ATTACHMENT_NOT_A_FILE"
  | "ATTACHMENT_TOO_LARGE"
  | "ATTACHMENT_URL_REFUSED";
