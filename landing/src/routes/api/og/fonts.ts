import type { FontOptions } from "satori";

let fontCache: ArrayBuffer[] | null = null;

const INTER_FONTS = [
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2",
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff2",
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
