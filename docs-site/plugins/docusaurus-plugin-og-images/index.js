/**
 * Docusaurus Plugin: OG Image Generator
 *
 * Generates unique Open Graph images (1200x630 PNG) for every page at build
 * time using satori + @resvg/resvg-js. The generated images are written to
 * the build output directory and the corresponding og:image / twitter:image
 * meta tags in each HTML file are updated in-place.
 *
 * Fonts (Inter Regular + Bold TTF) are bundled in the plugin's fonts/ dir so
 * they are never served to the browser.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Brand tokens (match NeuroLink docs-site dark theme)
// ---------------------------------------------------------------------------
const C = {
  bg: "#0a0a0a",
  blue: "#016fb9",
  orange: "#ff9505",
  text: "#fafafa",
  muted: "#94A3B8",
  border: "#1e293b",
};

// ---------------------------------------------------------------------------
// Template helpers — satori uses React-element-like plain objects
// ---------------------------------------------------------------------------

/** Renders the NeuroLink logo + wordmark bar at the top of the OG image. */
function logoBar() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 40,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: C.blue,
              alignItems: "center",
              justifyContent: "center",
            },
            children: {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  color: "white",
                  fontSize: 28,
                  fontWeight: 700,
                },
                children: "N",
              },
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: C.text,
            },
            children: [
              "Neuro",
              {
                type: "span",
                props: { style: { color: C.orange }, children: "Link" },
              },
            ],
          },
        },
      ],
    },
  };
}

/** Renders the footer bar with the site URL and tagline. */
function footerBar() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        marginTop: "auto",
        alignItems: "center",
        justifyContent: "space-between",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 18, color: C.muted },
            children: "docs.neurolink.ink",
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 16, color: C.muted },
            children: "Enterprise AI Development Platform",
          },
        },
      ],
    },
  };
}

/** Renders a small uppercase section label badge above the page title. */
function sectionBadge(label) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: 18,
        color: C.blue,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 16,
      },
      children: label,
    },
  };
}

// ---------------------------------------------------------------------------
// Build the element tree for a page
// ---------------------------------------------------------------------------

/** Builds the full 1200×630 satori element tree for the given page title and section. */
function buildTemplate(title, section) {
  // Truncate very long titles
  const displayTitle = title.length > 80 ? title.slice(0, 77) + "..." : title;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1200,
        height: 630,
        background: C.bg,
        padding: 60,
        fontFamily: "Inter",
      },
      children: [
        logoBar(),
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            },
            children: [
              sectionBadge(section),
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: displayTitle.length > 40 ? 44 : 52,
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.15,
                  },
                  children: displayTitle,
                },
              },
            ],
          },
        },
        footerBar(),
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Derive a human-readable section label from a URL path
// ---------------------------------------------------------------------------

/** Derives a human-readable section label (e.g. "SDK Reference") from a URL path. */
function deriveSection(routePath) {
  const parts = routePath.replace(/^\/|\/$/g, "").split("/");
  // Typical: /docs/features/foo → section = "Features"
  // /docs/sdk → section = "SDK"
  // /docs/getting-started → section = "Getting Started"
  if (parts.length >= 2) {
    const raw = parts[1];
    if (raw === "sdk") {
      return "SDK Reference";
    }
    if (raw === "cli") {
      return "CLI Guide";
    }
    return raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Documentation";
}

// ---------------------------------------------------------------------------
// Derive a slug for the OG image filename
// ---------------------------------------------------------------------------

/** Converts a route path to a unique filename slug using double-dash separators to avoid collisions. */
function routeToSlug(routePath) {
  const normalized = routePath.replace(/^\/|\/$/g, "");
  if (!normalized) {
    return "index";
  }
  // Use double-dash for path separators to avoid collisions
  // /docs/foo-bar → docs--foo-bar (different from /docs/foo/bar → docs--foo--bar)
  return normalized.replace(/\//g, "--");
}

// ---------------------------------------------------------------------------
// Plugin entry point
// ---------------------------------------------------------------------------

/** Docusaurus plugin that generates OG images for every page at build time. */
module.exports = function ogImagesPlugin(context) {
  return {
    name: "docusaurus-plugin-og-images",

    async postBuild({ outDir, routesPaths }) {
      // Lazy-load heavy deps only at build time
      const satori = (await import("satori")).default;
      const { Resvg } = require("@resvg/resvg-js");

      const fontsDir = path.join(__dirname, "fonts");
      const regularFont = fs.readFileSync(
        path.join(fontsDir, "Inter-Regular.ttf"),
      );
      const boldFont = fs.readFileSync(path.join(fontsDir, "Inter-Bold.ttf"));
      const fonts = [
        { name: "Inter", data: regularFont, weight: 400, style: "normal" },
        { name: "Inter", data: boldFont, weight: 700, style: "normal" },
      ];

      const ogDir = path.join(outDir, "img", "og");
      fs.mkdirSync(ogDir, { recursive: true });

      const siteUrl =
        process.env.OG_IMAGE_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        context.siteConfig.url ||
        "";
      let generated = 0;
      let skipped = 0;

      for (const routePath of routesPaths) {
        try {
          // Locate the built HTML file
          const htmlPath = path.join(outDir, routePath, "index.html");
          if (!fs.existsSync(htmlPath)) {
            skipped++;
            continue;
          }

          const html = fs.readFileSync(htmlPath, "utf-8");

          // Extract <title> for the OG image text
          // Docusaurus adds data-rh="true" attribute to the title tag
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/);
          let title = titleMatch
            ? titleMatch[1].replace(/\s*\|\s*NeuroLink\s*$/, "").trim()
            : "NeuroLink";
          if (!title) {
            title = "NeuroLink";
          }
          // Decode HTML entities produced by Docusaurus serialization.
          // Only decode well-known named/numeric entities to avoid
          // double-unescaping (addresses CodeQL alert #230).
          title = title.replace(/&#(\d+);/g, (_, code) =>
            String.fromCharCode(Number(code)),
          );
          title = title.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          );
          title = title.replace(/&quot;/g, '"');
          title = title.replace(/&lt;/g, "<");
          title = title.replace(/&gt;/g, ">");
          title = title.replace(/&amp;/g, "&"); // Must be last to avoid double-decode

          const section = deriveSection(routePath);
          const slug = routeToSlug(routePath);
          const baseUrl = (context.siteConfig.baseUrl || "/").replace(
            /\/$/,
            "",
          );
          const ogImageRelPath = `${baseUrl}/img/og/${slug}.png`;
          const ogImageAbsUrl = `${siteUrl}${ogImageRelPath}`;

          // Render SVG via satori
          const template = buildTemplate(title, section);
          const svg = await satori(template, {
            width: 1200,
            height: 630,
            fonts,
          });

          // Convert SVG → PNG via resvg
          const resvg = new Resvg(svg, {
            fitTo: { mode: "width", value: 1200 },
          });
          const png = resvg.render().asPng();
          fs.writeFileSync(path.join(ogDir, `${slug}.png`), png);

          // Replace og:image and twitter:image in the HTML
          // Docusaurus adds data-rh="true" and other attributes to meta tags,
          // so we use flexible regexes that match any attributes around the
          // property/name and content pairs.
          let updated = html;

          // Replace existing og:image
          updated = updated.replace(
            /<meta\s+[^>]*property="og:image"[^>]*content="[^"]*"/,
            (match) =>
              match.replace(/content="[^"]*"/, `content="${ogImageAbsUrl}"`),
          );

          // Replace existing twitter:image
          updated = updated.replace(
            /<meta\s+[^>]*name="twitter:image"[^>]*content="[^"]*"/,
            (match) =>
              match.replace(/content="[^"]*"/, `content="${ogImageAbsUrl}"`),
          );

          // If og:image didn't exist, inject it before </head>
          if (!updated.includes('property="og:image"')) {
            updated = updated.replace(
              "</head>",
              `<meta property="og:image" content="${ogImageAbsUrl}">\n</head>`,
            );
          }

          // If twitter:image didn't exist, inject it before </head>
          if (!updated.includes('name="twitter:image"')) {
            updated = updated.replace(
              "</head>",
              `<meta name="twitter:image" content="${ogImageAbsUrl}">\n</head>`,
            );
          }

          if (updated !== html) {
            fs.writeFileSync(htmlPath, updated);
          }

          generated++;
        } catch (err) {
          // Don't break the build for a single page failure
          console.warn(
            `[og-images] Failed to generate OG image for ${routePath}: ${err.message}`,
          );
          skipped++;
        }
      }

      console.log(
        `[og-images] Generated ${generated} OG images (${skipped} skipped)`,
      );
    },
  };
};
