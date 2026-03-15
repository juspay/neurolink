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
      const res = await fetch(font.url);
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
