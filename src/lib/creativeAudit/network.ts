import { safeDownload } from "../utils/safeFetch.js";
import { publicAuditUrl } from "./schemas.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";

/** Use the SDK's DNS-pinned, proxy-aware transport. Redirects fail closed.
 * An outer deadline also covers DNS and body reads (not just response headers). */
export const downloadAuditBytes = async (
  url: string,
  maxBytes: number,
  parent?: AbortSignal,
): Promise<Buffer> => {
  const timeout = AbortSignal.timeout(LIMITS.imageTimeoutMs);
  const signal = parent ? AbortSignal.any([parent, timeout]) : timeout;
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new Error("Audit download cancelled or timed out."));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([
      safeDownload(publicAuditUrl(url).toString(), {
        maxBytes,
        label: "Image audit asset",
        timeoutMs: LIMITS.imageTimeoutMs,
        signal,
      }),
      aborted,
    ]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
};
