import type { Font as FontOptions } from "satori";

let fontCache: ArrayBuffer[] | null = null;

// satori parses TTF, OTF and WOFF but not WOFF2, which is what Google Fonts
// serves. These are the same Inter latin subsets as WOFF, from a version-pinned
// @fontsource/inter release (SIL OFL 1.1).
const FONTSOURCE_INTER =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.3.0/files";

const INTER_FONTS = [
  {
    url: `${FONTSOURCE_INTER}/inter-latin-400-normal.woff`,
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    url: `${FONTSOURCE_INTER}/inter-latin-600-normal.woff`,
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    url: `${FONTSOURCE_INTER}/inter-latin-700-normal.woff`,
    weight: 700 as const,
    style: "normal" as const,
  },
];

// Return as `FontOptions[]` directly so satori's stricter `weight` /
// `style` literal unions are preserved through the call chain (was being
// widened to `number` / `string` by the public return-type annotation,
// causing assignability errors at the satori call site).
export async function loadFonts(): Promise<FontOptions[]> {
  if (fontCache) {
    return fontCache.map((data, i) => ({
      name: "Inter",
      data,
      weight: INTER_FONTS[i].weight,
      style: INTER_FONTS[i].style,
    }));
  }

  const buffers = await Promise.all(
    INTER_FONTS.map(async (font) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(font.url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(
            `Failed to fetch font ${font.url}: ${res.status} ${res.statusText}`,
          );
        }
        return res.arrayBuffer();
      } finally {
        clearTimeout(timeoutId);
      }
    }),
  );

  fontCache = buffers;

  return buffers.map((data, i) => ({
    name: "Inter",
    data,
    weight: INTER_FONTS[i].weight,
    style: INTER_FONTS[i].style,
  }));
}
