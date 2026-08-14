/**
 * Bounded ZIP entry reading, shared by every processor that opens a ZIP.
 *
 * Extracted from ArchiveProcessor because the Office formats are ZIPs too:
 * .pptx and .odt read their entries directly and so can be handed the same
 * bomb, and need the same refusal. One implementation rather than three means
 * a correction to the guard lands everywhere at once.
 *
 * .docx and .xlsx deliberately do NOT use this. mammoth and exceljs unzip for
 * themselves and were measured refusing a 400MB bomb at 46MB and 53MB peak,
 * so wrapping them in a pre-scan bought no safety and roughly tripled the cost
 * of every ordinary document.
 *
 * @module processors/archive/zipEntryReader
 */

import type {
  ArchiveEntryReadResult,
  BoundedZipEntry,
} from "../../types/index.js";

/** ZIP compression methods this reader handles (APPNOTE 4.4.5). */
export const ZIP_METHOD_STORED = 0;
export const ZIP_METHOD_DEFLATED = 8;

/**
 * Whether a zlib rejection is the output bound firing rather than bad input.
 *
 * `maxOutputLength` aborts an inflate the moment its output would pass the cap,
 * which is the whole point — but it surfaces as a plain `RangeError`, and a
 * bomb reported as "failed to decompress" reads as a corrupt upload and invites
 * the user to send it again. It will fail identically every time.
 *
 * Keyed on `code`, not the message: the message embeds a byte count.
 */
export const isDecompressionBoundExceeded = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ERR_BUFFER_TOO_LARGE";

/**
 * Read one ZIP entry's bytes without trusting the size it declares.
 *
 * `entry.getData()` cannot be used for this. It sizes its output buffer from
 * the central-directory `size` field, which the archive author chooses, and
 * adm-zip only arms its own guard when that field is positive:
 *
 *   const option = version >= 15 && expectedLength > 0
 *     ? { maxOutputLength: expectedLength } : {};
 *
 * So an entry declaring 0 disables the bound and the caller's `size > maxSize`
 * check in one move — `0 > 5MB` is false, and the inflate then runs uncapped.
 * The declared size is the attack, so nothing here may depend on it: the cap
 * comes from our own limit and is handed to the decoder.
 *
 * CRC is verified on both paths rather than dropped, so bypassing `getData()`
 * does not also quietly lose its corruption check — a STORED entry is copied
 * out rather than decoded, but it can be damaged just the same. It detects
 * damage, not malice — the CRC field is attacker-controlled too.
 */
export function readZipEntryWithinLimit(
  entry: BoundedZipEntry,
  maxBytes: number,
  zlibModule: typeof import("zlib"),
): ArchiveEntryReadResult {
  const compressed = entry.getCompressedData();
  const matchesCrc = (data: Buffer): boolean =>
    (zlibModule.crc32(data) >>> 0) === (entry.header.crc >>> 0);

  // STORED: the bytes are already the payload, so its own length is the bound.
  if (entry.header.method === ZIP_METHOD_STORED) {
    if (compressed.length > maxBytes) {
      return { status: "too-large" };
    }
    return matchesCrc(compressed)
      ? { status: "ok", buffer: compressed }
      : { status: "corrupt" };
  }
  if (entry.header.method !== ZIP_METHOD_DEFLATED) {
    return { status: "unsupported-method" };
  }

  let inflated: Buffer;
  try {
    inflated = zlibModule.inflateRawSync(compressed, {
      maxOutputLength: maxBytes,
    });
  } catch (error) {
    if (isDecompressionBoundExceeded(error)) {
      return { status: "too-large" };
    }
    return { status: "corrupt" };
  }

  return matchesCrc(inflated)
    ? { status: "ok", buffer: inflated }
    : { status: "corrupt" };
}

