let fontCache: ArrayBuffer[] | null = null;

const FONT_FETCH_TIMEOUT_MS = 5000;

const INTER_FONTS = [
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
    weight: 700 as const,
    style: "normal" as const,
  },
];

export async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: number; style: string }[]
> {
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
      const timeout = setTimeout(
        () => controller.abort(),
        FONT_FETCH_TIMEOUT_MS,
      );
      let res: Response;
      try {
        res = await fetch(font.url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        throw new Error(
          `Font fetch failed: ${res.status} ${res.statusText} for ${font.url}`,
        );
      }
      return res.arrayBuffer();
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
