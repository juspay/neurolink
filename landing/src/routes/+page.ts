// Prerender the landing page to static HTML so search crawlers see the real
// content (was `ssr = false`, which shipped an empty shell — 0 words / 0 <h1> to
// non-JS crawlers). All browser-only code (NeuralTopology canvas, CustomCursor,
// GSAP, Lenis) is gated inside onMount(), so it's SSR/prerender-safe.
export const prerender = true;
