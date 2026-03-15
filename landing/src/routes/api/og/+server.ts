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

  const svg = await satori(vdom, {
    width: 1200,
    height: 630,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
};
