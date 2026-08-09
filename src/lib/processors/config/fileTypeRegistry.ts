/**
 * Canonical file-format registry — the single source of truth for
 * extension ↔ MIME ↔ FileType ↔ modality.
 *
 * ## Why this exists
 *
 * The same knowledge used to live in five hand-maintained tables that had no
 * way of agreeing with each other:
 *
 *   1. `EXTENSION_MIME_MAP`                      (config/mimeConstants.ts)
 *   2. the `*_EXTENSIONS` category arrays        (config/fileExtensions.ts)
 *   3. `ExtensionStrategy.typeMap` + `.mimeMap`  (utils/fileDetector.ts)
 *   4. `EXTENSION_TYPE_MAP`                      (utils/messageBuilder.ts)
 *   5. each processor's `supportedExtensions` / `supportedMimeTypes`
 *
 * They drifted, and the drift was not cosmetic — a format that a processor
 * declared it supported was routinely invisible to the detector standing in
 * front of it, so the file never reached the processor at all. Measured on real
 * ffmpeg-generated media before this registry existed:
 *
 *   .aiff .m2ts .mts .vob .3g2 .3gp   → "unknown"  (downgraded to metadata text)
 *   .mpg .mpeg                        → "csv"      (binary parsed as a spreadsheet)
 *   .ts                               → "text"     (MPEG-TS inlined as source code)
 *
 * Deriving all five consumers from one table makes that class of drift
 * structurally impossible rather than merely fixed once.
 *
 * ## Invariants
 *
 * - `extensions[0]` is canonical for the format; the rest are accepted aliases.
 * - `mimeTypes[0]` is canonical; the rest are aliases seen in the wild
 *   (`audio/x-wav`, `image/x-icon`, vendor prefixes, …).
 * - Every extension and every MIME type appears in exactly one entry. The
 *   `assertRegistryIsUnambiguous()` check below is executed at module load, so
 *   a duplicate is a startup failure rather than a silent last-write-wins.
 * - `fileType` is the *routing* type the detector emits (what processor to
 *   use); `modality` is the *category* a human means. They deliberately differ:
 *   an .odt is `fileType: "docx"` (the Word processor handles it) but
 *   `modality: "document"`, and .svg is `fileType: "svg"` (sanitised as markup,
 *   never sent to a vision API) but `modality: "image"`.
 *
 * @module processors/config/fileTypeRegistry
 */

import type {
  FileFormatEntry,
  FileModality,
  FileType,
} from "../../types/index.js";

/**
 * Every file format NeuroLink can identify, grouped by modality.
 *
 * Adding a format here is all that is required — the extension map, the MIME
 * map, the detector's lookup tables, the category arrays and the media
 * processors' supported-format lists are all derived from this array.
 */
export const FILE_TYPE_REGISTRY: readonly FileFormatEntry[] = [
  // ===========================================================================
  // IMAGE
  // ===========================================================================
  {
    label: "JPEG image",
    extensions: [".jpg", ".jpeg", ".jpe", ".jfif"],
    mimeTypes: ["image/jpeg", "image/jpg"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "PNG image",
    extensions: [".png"],
    mimeTypes: ["image/png"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "Animated PNG",
    extensions: [".apng"],
    mimeTypes: ["image/apng"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "GIF image",
    extensions: [".gif"],
    mimeTypes: ["image/gif"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "WebP image",
    extensions: [".webp"],
    mimeTypes: ["image/webp"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "BMP image",
    extensions: [".bmp", ".dib"],
    mimeTypes: ["image/bmp", "image/x-ms-bmp"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "TIFF image",
    extensions: [".tiff", ".tif"],
    mimeTypes: ["image/tiff", "image/x-tiff"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "AVIF image",
    extensions: [".avif"],
    mimeTypes: ["image/avif"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "HEIC image",
    extensions: [".heic", ".heics"],
    mimeTypes: ["image/heic", "image/heic-sequence"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "HEIF image",
    extensions: [".heif", ".heifs"],
    mimeTypes: ["image/heif", "image/heif-sequence"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "JPEG 2000 image",
    extensions: [".jp2", ".j2k", ".jpf", ".jpx"],
    mimeTypes: ["image/jp2", "image/jpx"],
    fileType: "image",
    modality: "image",
  },
  {
    label: "Icon",
    extensions: [".ico"],
    mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon"],
    fileType: "image",
    modality: "image",
  },
  {
    // SVG is markup, not raster. It is sanitised and passed as text — no vision
    // provider accepts image/svg+xml — hence fileType "svg" rather than "image".
    label: "SVG image",
    extensions: [".svg", ".svgz"],
    mimeTypes: ["image/svg+xml"],
    fileType: "svg",
    modality: "image",
  },

  // ===========================================================================
  // VIDEO
  // ===========================================================================
  {
    label: "MP4 video",
    extensions: [".mp4", ".m4v"],
    mimeTypes: ["video/mp4", "video/x-m4v"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "QuickTime video",
    extensions: [".mov", ".qt"],
    mimeTypes: ["video/quicktime"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "Matroska video",
    extensions: [".mkv"],
    mimeTypes: ["video/x-matroska"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "WebM video",
    extensions: [".webm"],
    mimeTypes: ["video/webm"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "AVI video",
    extensions: [".avi"],
    mimeTypes: ["video/x-msvideo", "video/avi", "video/msvideo"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "Windows Media video",
    extensions: [".wmv", ".asf"],
    mimeTypes: ["video/x-ms-wmv", "video/x-ms-asf"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "Flash video",
    extensions: [".flv", ".f4v"],
    mimeTypes: ["video/x-flv"],
    fileType: "video",
    modality: "video",
  },
  {
    // MPEG-1/2 program stream. Detected as CSV before this registry existed,
    // because the content heuristics saw consistent delimiters in the binary.
    label: "MPEG video",
    extensions: [".mpg", ".mpeg", ".mpe", ".m1v", ".m2v", ".vob"],
    mimeTypes: ["video/mpeg", "video/x-mpeg"],
    fileType: "video",
    modality: "video",
  },
  {
    // MPEG-2 transport stream. `.ts` collides with TypeScript source; the
    // extension resolves to TypeScript (overwhelmingly the common case in a
    // TypeScript SDK) and content detection reclaims genuine transport streams
    // via their 0x47 sync pattern. See TYPESCRIPT_AMBIGUOUS_EXTENSIONS.
    label: "MPEG transport stream",
    extensions: [".m2ts", ".mts", ".ts", ".m2t"],
    // Lookups lowercase before matching, so the IANA-registered "video/MP2T"
    // spelling resolves through the same entry without a separate alias.
    mimeTypes: ["video/mp2t"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "3GPP video",
    extensions: [".3gp", ".3gpp"],
    mimeTypes: ["video/3gpp"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "3GPP2 video",
    extensions: [".3g2", ".3gpp2"],
    mimeTypes: ["video/3gpp2"],
    fileType: "video",
    modality: "video",
  },
  {
    label: "Ogg video",
    extensions: [".ogv"],
    mimeTypes: ["video/ogg"],
    fileType: "video",
    modality: "video",
  },

  // ===========================================================================
  // AUDIO
  // ===========================================================================
  {
    label: "MP3 audio",
    extensions: [".mp3", ".mp2", ".mpga"],
    mimeTypes: ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "WAV audio",
    extensions: [".wav", ".wave"],
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "FLAC audio",
    extensions: [".flac"],
    mimeTypes: ["audio/flac", "audio/x-flac"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Ogg audio",
    extensions: [".ogg", ".oga"],
    mimeTypes: ["audio/ogg", "audio/vorbis", "audio/x-vorbis+ogg"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Opus audio",
    extensions: [".opus"],
    mimeTypes: ["audio/opus"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "MPEG-4 audio",
    extensions: [".m4a", ".m4b", ".m4p"],
    mimeTypes: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "AAC audio",
    extensions: [".aac", ".adts"],
    mimeTypes: ["audio/aac", "audio/aacp", "audio/x-aac"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Windows Media audio",
    extensions: [".wma"],
    mimeTypes: ["audio/x-ms-wma"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "AIFF audio",
    extensions: [".aiff", ".aif", ".aifc"],
    mimeTypes: ["audio/aiff", "audio/x-aiff"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "AMR audio",
    extensions: [".amr"],
    mimeTypes: ["audio/amr", "audio/3gpp"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Monkey's Audio",
    extensions: [".ape"],
    mimeTypes: ["audio/x-ape", "audio/ape"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "WavPack audio",
    extensions: [".wv"],
    mimeTypes: ["audio/x-wavpack", "audio/wavpack"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "MIDI",
    extensions: [".mid", ".midi"],
    mimeTypes: ["audio/midi", "audio/x-midi"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Core Audio",
    extensions: [".caf"],
    mimeTypes: ["audio/x-caf"],
    fileType: "audio",
    modality: "audio",
  },
  {
    label: "Sun audio",
    extensions: [".au", ".snd"],
    mimeTypes: ["audio/basic"],
    fileType: "audio",
    modality: "audio",
  },

  // ===========================================================================
  // DOCUMENTS
  // ===========================================================================
  {
    label: "PDF document",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf", "application/x-pdf"],
    fileType: "pdf",
    modality: "document",
  },
  {
    label: "Word document",
    extensions: [".docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    fileType: "docx",
    modality: "document",
  },
  {
    label: "Legacy Word document",
    extensions: [".doc"],
    mimeTypes: ["application/msword"],
    fileType: "docx",
    modality: "document",
  },
  {
    label: "Excel spreadsheet",
    extensions: [".xlsx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    fileType: "xlsx",
    modality: "document",
  },
  {
    label: "Legacy Excel spreadsheet",
    extensions: [".xls"],
    mimeTypes: ["application/vnd.ms-excel"],
    fileType: "xlsx",
    modality: "document",
  },
  {
    label: "PowerPoint presentation",
    extensions: [".pptx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    fileType: "pptx",
    modality: "document",
  },
  {
    label: "Legacy PowerPoint presentation",
    extensions: [".ppt"],
    mimeTypes: ["application/vnd.ms-powerpoint"],
    fileType: "pptx",
    modality: "document",
  },
  {
    label: "OpenDocument text",
    extensions: [".odt"],
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
    fileType: "docx",
    modality: "document",
  },
  {
    label: "OpenDocument spreadsheet",
    extensions: [".ods"],
    mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"],
    fileType: "xlsx",
    modality: "document",
  },
  {
    label: "OpenDocument presentation",
    extensions: [".odp"],
    mimeTypes: ["application/vnd.oasis.opendocument.presentation"],
    fileType: "pptx",
    modality: "document",
  },
  {
    label: "Rich Text Format",
    extensions: [".rtf"],
    mimeTypes: ["application/rtf", "text/rtf"],
    fileType: "docx",
    modality: "document",
  },

  // ===========================================================================
  // TABULAR DATA
  // ===========================================================================
  {
    label: "CSV data",
    extensions: [".csv"],
    mimeTypes: ["text/csv", "application/csv"],
    fileType: "csv",
    modality: "data",
  },
  {
    label: "TSV data",
    extensions: [".tsv", ".tab"],
    mimeTypes: ["text/tab-separated-values"],
    fileType: "csv",
    modality: "data",
  },

  // ===========================================================================
  // ARCHIVES
  // ===========================================================================
  {
    label: "ZIP archive",
    extensions: [".zip"],
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "TAR archive",
    extensions: [".tar"],
    mimeTypes: ["application/x-tar"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "GZIP archive",
    extensions: [".gz", ".tgz", ".tar.gz"],
    mimeTypes: ["application/gzip", "application/x-gzip"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "BZIP2 archive",
    extensions: [".bz2", ".tbz2", ".tar.bz2"],
    mimeTypes: ["application/x-bzip2"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "XZ archive",
    extensions: [".xz", ".txz", ".tar.xz"],
    mimeTypes: ["application/x-xz"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "Zstandard archive",
    extensions: [".zst"],
    mimeTypes: ["application/zstd"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "RAR archive",
    extensions: [".rar"],
    mimeTypes: ["application/x-rar-compressed", "application/vnd.rar"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "7-Zip archive",
    extensions: [".7z"],
    mimeTypes: ["application/x-7z-compressed"],
    fileType: "archive",
    modality: "archive",
  },
  {
    label: "Java archive",
    extensions: [".jar"],
    mimeTypes: ["application/java-archive"],
    fileType: "archive",
    modality: "archive",
  },
];

// =============================================================================
// DERIVED LOOKUPS
// =============================================================================

/**
 * Extensions whose format is genuinely ambiguous and whose non-media reading
 * wins when only the filename is available.
 *
 * `.ts` is both MPEG-2 transport stream and TypeScript source. In a TypeScript
 * SDK the source reading is overwhelmingly more likely, so the extension
 * resolves to TypeScript; a real transport stream is still recognised by
 * content (its 0x47 sync byte repeating at a 188- or 192-byte stride), and
 * content detection runs first, so the correct answer wins whenever the bytes
 * are available.
 *
 * The override carries the MIME type as well as the routing type. Overriding
 * only the routing type produced a self-contradictory answer — a .ts file came
 * back as `type: "text"` with `mimeType: "video/mp2t"`, because the derived
 * `EXTENSION_MIME_MAP` still took its MIME from the transport-stream entry.
 * That value is public API and reaches telemetry, so both halves must agree.
 */
const EXTENSION_OVERRIDES: Readonly<
  Record<
    string,
    { fileType: FileType; mimeType: string; modality: FileModality | null }
  >
> = {
  ".ts": {
    fileType: "text",
    mimeType: "text/typescript",
    // `null`, not "document": TypeScript source belongs to no media modality at
    // all. Naming one would be wrong in both directions — it would put .ts into
    // DOCUMENT_EXTENSIONS, and it could never be honoured symmetrically anyway,
    // because extensionsForModality() iterates registry entries and .ts lives
    // in the transport-stream entry. An override can remove an extension from
    // its entry's modality; it cannot move it into another entry's. `null`
    // makes both helpers agree by construction: listed under no modality, and
    // never reported as belonging to one.
    modality: null,
  },
};

/**
 * Extensions that must NOT be treated as belonging to their registry entry's
 * modality when only a filename is available.
 *
 * Derived from {@link EXTENSION_OVERRIDES}: `extensionsForModality("video")`
 * feeds both `VIDEO_EXTENSIONS` and `VideoProcessor`'s supported list, and
 * `BaseFileProcessor.isFileSupported` accepts a file when the *extension*
 * matches even if the supplied mimetype says otherwise. Leaving `.ts` in that
 * list made `isVideoFile("text/plain", "app.ts")` return true.
 */
/**
 * Extension → MIME for the overridden extensions only.
 *
 * Exported so `EXTENSION_MIME_MAP` can apply the override as its FINAL layer.
 * That map is built by spreading the registry over the text map, so without
 * this the registry's `.ts → video/mp2t` won again and `getMimeTypeForExtension`
 * disagreed with `mimeTypeForExtension` about the very same file.
 */
export const EXTENSION_MIME_OVERRIDES: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(EXTENSION_OVERRIDES).map(([ext, o]) => [ext, o.mimeType]),
  );

const extensionToEntry = new Map<string, FileFormatEntry>();
const mimeTypeToEntry = new Map<string, FileFormatEntry>();

/**
 * Fail loudly at module load if two entries claim the same extension or MIME
 * type. Silently letting the later entry win is exactly how the five legacy
 * tables drifted apart in the first place.
 */
function assertRegistryIsUnambiguous(): void {
  for (const entry of FILE_TYPE_REGISTRY) {
    for (const ext of entry.extensions) {
      const existing = extensionToEntry.get(ext);
      if (existing) {
        throw new Error(
          `File-type registry: extension "${ext}" is claimed by both ` +
            `"${existing.label}" and "${entry.label}".`,
        );
      }
      extensionToEntry.set(ext, entry);
    }
    for (const mime of entry.mimeTypes) {
      const key = mime.toLowerCase();
      const existing = mimeTypeToEntry.get(key);
      if (existing) {
        throw new Error(
          `File-type registry: MIME type "${mime}" is claimed by both ` +
            `"${existing.label}" and "${entry.label}".`,
        );
      }
      mimeTypeToEntry.set(key, entry);
    }
  }
}

assertRegistryIsUnambiguous();

/**
 * Normalize an extension to the registry's key form: lowercased, with a leading
 * dot. Accepts `"png"`, `".PNG"`, `"image.png"` and `"/tmp/a.png"` alike.
 *
 * Compound extensions (`.tar.gz`) are matched before the single-segment form so
 * a `.tar.gz` resolves to the gzip entry rather than to `.gz` by accident —
 * they happen to agree today, but the lookup should not depend on that.
 */
export function normalizeExtension(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) {
    return "";
  }
  const withoutPath = lower.slice(
    Math.max(lower.lastIndexOf("/"), lower.lastIndexOf("\\")) + 1,
  );
  const firstDot = withoutPath.indexOf(".");
  if (firstDot === -1) {
    return `.${withoutPath}`;
  }
  // Walk every suffix longest-first so a registered compound extension wins over
  // its last segment: "release.tar.gz" must resolve to ".tar.gz", and starting
  // at the *first* dot alone would miss it for "v1.0.tar.gz".
  for (let i = firstDot; i !== -1; i = withoutPath.indexOf(".", i + 1)) {
    const suffix = withoutPath.slice(i);
    if (extensionToEntry.has(suffix)) {
      return suffix;
    }
  }
  return withoutPath.slice(withoutPath.lastIndexOf("."));
}

/** Look up the registry entry for a file extension, or undefined. */
export function lookupByExtension(ext: string): FileFormatEntry | undefined {
  return extensionToEntry.get(normalizeExtension(ext));
}

/**
 * Look up the registry entry for a MIME type, or undefined. Any `;charset=…`
 * parameter is stripped, matching how Content-Type headers arrive.
 */
export function lookupByMimeType(mime: string): FileFormatEntry | undefined {
  return mimeTypeToEntry.get(mime.split(";")[0].trim().toLowerCase());
}

/**
 * Routing {@link FileType} for an extension, honouring {@link EXTENSION_OVERRIDES}.
 * Returns undefined when the extension is not in the registry.
 */
export function fileTypeForExtension(ext: string): FileType | undefined {
  const normalized = normalizeExtension(ext);
  const override = EXTENSION_OVERRIDES[normalized];
  if (override) {
    return override.fileType;
  }
  return extensionToEntry.get(normalized)?.fileType;
}

/** Canonical MIME type for an extension, or undefined when unknown. */
export function mimeTypeForExtension(ext: string): string | undefined {
  const normalized = normalizeExtension(ext);
  // Honour the override here too — see EXTENSION_OVERRIDES for why the routing
  // type and the MIME type must not be allowed to disagree.
  return (
    EXTENSION_OVERRIDES[normalized]?.mimeType ??
    extensionToEntry.get(normalized)?.mimeTypes[0]
  );
}

/** Canonical extension (with leading dot) for a MIME type, or undefined. */
export function extensionForMimeType(mime: string): string | undefined {
  return lookupByMimeType(mime)?.extensions[0];
}

/** Every extension registered for a modality, in registry order. */
export function extensionsForModality(
  modality: FileModality,
): readonly string[] {
  return FILE_TYPE_REGISTRY.filter((e) => e.modality === modality)
    .flatMap((e) => [...e.extensions])
    .filter((ext) => {
      const override = EXTENSION_OVERRIDES[ext];
      // An overridden extension only belongs to the modality it was overridden
      // TO, so `.ts` leaves the video lists and cannot be matched as video on
      // filename alone. Content detection still reclaims real streams.
      return !override || override.modality === modality;
    });
}

/** Every MIME type registered for a modality, in registry order. */
export function mimeTypesForModality(
  modality: FileModality,
): readonly string[] {
  return FILE_TYPE_REGISTRY.filter((e) => e.modality === modality).flatMap(
    (e) => [...e.mimeTypes],
  );
}

/**
 * True when the extension belongs to the given modality. Uses the entry's
 * modality, not its routing `fileType`, so `.svg` counts as an image and `.odt`
 * counts as a document.
 */
export function isModalityExtension(
  ext: string,
  modality: FileModality,
): boolean {
  // Must consult EXTENSION_OVERRIDES for the same reason extensionsForModality
  // does — otherwise the two disagree about the same extension, and `.ts` is
  // absent from the video list yet still answers true to "is this video?".
  const override = EXTENSION_OVERRIDES[normalizeExtension(ext)];
  if (override) {
    // A null override modality means "no media modality", so this is false for
    // every modality — matching extensionsForModality(), which lists it under
    // none. See EXTENSION_OVERRIDES for why the two must agree.
    return override.modality === modality;
  }
  return lookupByExtension(ext)?.modality === modality;
}
