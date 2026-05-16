import type { RequestHandler } from "./$types";
import satori from "satori";
import { html } from "satori-html";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { loadFonts } from "./fonts";
import { getTemplate, type OGType } from "./templates";

let wasmInitialized = false;

async function ensureWasm() {
  if (wasmInitialized) return;
  try {
    await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"));
  } catch {
    // Already initialized (e.g. warm function)
  }
  wasmInitialized = true;
}

const VALID_TYPES = new Set<OGType>(["home", "docs", "sdk", "examples"]);

export const GET: RequestHandler = async ({ url }) => {
  const type = (url.searchParams.get("type") || "home") as OGType;
  const title = url.searchParams.get("title") || undefined;
  const subtitle = url.searchParams.get("subtitle") || undefined;
  const section = url.searchParams.get("section") || undefined;
  const method = url.searchParams.get("method") || undefined;

  const resolvedType = VALID_TYPES.has(type) ? type : "home";

  const [fonts] = await Promise.all([loadFonts(), ensureWasm()]);

  const markup = getTemplate({
    type: resolvedType,
    title,
    subtitle,
    section,
    method,
  });

  const vdom = html(markup);

  // satori-html returns a VNode that satori accepts via its untyped JSX
  // surface, but TypeScript can't bridge the two type names. Cast through
  // `unknown` per the satori-html recommended pattern.
  const svg = await satori(vdom as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const pngData = resvg.render();
  // resvg-wasm returns `Uint8Array<ArrayBufferLike>`; Response's BodyInit
  // wants a tighter `Uint8Array<ArrayBuffer>`. Wrap to re-narrow the
  // underlying buffer type without copying.
  const pngBuffer = new Uint8Array(pngData.asPng());

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
};
