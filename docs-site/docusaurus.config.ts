import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import prismDarkTheme from "./src/theme/prism-neurolink-dark";
// Custom Prism themes will be imported from local files
import prismLightTheme from "./src/theme/prism-neurolink-light";
// Redirects configuration for legacy paths and SEO
import { redirectsPluginConfig } from "./config/redirects";

const config: Config = {
  title: "NeuroLink",
  tagline:
    "Enterprise AI Development Platform - Universal provider support, MCP integration, and professional CLI",
  favicon: "img/favicon.svg",

  // Production URL - custom domain
  url: "https://docs.neurolink.ink",
  baseUrl: "/",

  organizationName: "juspay",
  projectName: "neurolink",

  onBrokenLinks: process.env.NODE_ENV === "production" ? "throw" : "warn",
  onBrokenAnchors: process.env.NODE_ENV === "production" ? "throw" : "warn",

  // Custom fields for Algolia and analytics
  customFields: {
    algoliaAppId: process.env.ALGOLIA_APP_ID,
    algoliaSearchApiKey: process.env.ALGOLIA_SEARCH_API_KEY,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    posthogHost: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
  },

  // Head tags for performance and verification
  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "algolia-site-verification",
        content: "6D4D16FE88B771D9",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "anonymous",
      },
    },
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Juspay Technologies",
        url: "https://juspay.io",
        logo: "https://docs.neurolink.ink/img/logo-light.svg",
        sameAs: ["https://github.com/juspay/neurolink"],
      }),
    },
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "NeuroLink",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Cross-platform",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      }),
    },
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: "NeuroLink SDK",
        programmingLanguage: "TypeScript",
        codeRepository: "https://github.com/juspay/neurolink",
        license: "https://opensource.org/licenses/MIT",
      }),
    },
  ],

  markdown: {
    format: "mdx",
    mermaid: false,
    mdx1Compat: {
      comments: true,
      admonitions: true,
      headingIds: true,
    },
    hooks: {
      onBrokenMarkdownImages: "warn",
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Production optimizations disabled - requires @docusaurus/faster package
  // ...(process.env.NODE_ENV === "production" && {
  //   future: {
  //     experimental_faster: true,
  //   },
  // }),

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "docs", // Docs at /docs, root redirects to getting-started
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/juspay/neurolink/tree/release/docs-site/",
          exclude: [
            "**/api/**",
            "**/cli-guide.md",
            "**/package-overrides.md",
            "**/mcp/concurrency.md",
            "**/features/interactive-cli.md",
          ],
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          breadcrumbs: true,
          // Versioning configuration
          lastVersion: "current",
          versions: {
            current: {
              label: "Next",
              path: "",
              banner: "none",
            },
          },
          // Only include current version in development for faster builds
          onlyIncludeVersions:
            process.env.NODE_ENV === "development" ? ["current"] : undefined,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          lastmod: "date",
          changefreq: "weekly",
          priority: 0.5,
          filename: "sitemap.xml",
          createSitemapItems: async (params) => {
            const { defaultCreateSitemapItems, ...rest } = params;
            const items = await defaultCreateSitemapItems(rest);
            return items.map((item) => {
              if (item.url.includes("/getting-started")) {
                return { ...item, priority: 1.0, changefreq: "daily" };
              }
              if (item.url.includes("/sdk") || item.url.includes("/cli")) {
                return { ...item, priority: 0.9 };
              }
              if (
                item.url.includes("/features/") ||
                item.url.includes("/examples")
              ) {
                return { ...item, priority: 0.8 };
              }
              return item;
            });
          },
        },
        ...(process.env.NODE_ENV === "production" &&
          process.env.GA_TRACKING_ID && {
            gtag: {
              trackingID: process.env.GA_TRACKING_ID,
              anonymizeIP: true,
            },
          }),
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/neurolink-social-card.png",

    metadata: [
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "NeuroLink" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@jaborhey" },
      { name: "twitter:creator", content: "@jaborhey" },
    ],

    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    announcementBar: {
      id: "v9_12_release",
      content:
        'NeuroLink v9.12 is out — SDK boundary items, context windows & caching. <a href="/docs/community/changelog">See changelog</a>',
      backgroundColor: "var(--neurolink-accent)",
      textColor: "#ffffff",
      isCloseable: true,
    },

    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },

    navbar: {
      title: "NeuroLink",
      logo: {
        alt: "NeuroLink Logo",
        src: "img/logo-light.svg",
        srcDark: "img/logo-dark.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          to: "/docs/sdk",
          label: "SDK",
          position: "left",
        },
        {
          to: "/docs/cli",
          label: "CLI",
          position: "left",
        },
        {
          to: "/docs/examples",
          label: "Examples",
          position: "left",
        },
        {
          href: "https://blog.neurolink.ink",
          label: "Blog",
          position: "left",
        },
        {
          href: "https://www.npmjs.com/package/@juspay/neurolink",
          label: "NPM",
          position: "right",
        },
        {
          href: "https://github.com/juspay/neurolink",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },

    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Getting Started", to: "/docs/getting-started" },
            { label: "SDK Reference", to: "/docs/sdk" },
            { label: "CLI Guide", to: "/docs/cli" },
            { label: "Examples", to: "/docs/examples" },
          ],
        },
        {
          title: "Features",
          items: [
            {
              label: "MCP Integration",
              to: "/docs/features/mcp-tools-showcase",
            },
            { label: "Multimodal", to: "/docs/features/multimodal" },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "Blog", href: "https://blog.neurolink.ink" },
            { label: "GitHub", href: "https://github.com/juspay/neurolink" },
            {
              label: "GitHub Discussions",
              href: "https://github.com/juspay/neurolink/discussions",
            },
            {
              label: "NPM Package",
              href: "https://www.npmjs.com/package/@juspay/neurolink",
            },
          ],
        },
        {
          title: "More",
          items: [
            { label: "Juspay", href: "https://juspay.io" },
            {
              label: "Contributing",
              href: "https://github.com/juspay/neurolink/blob/release/CONTRIBUTING.md",
            },
            { label: "llms.txt", href: "pathname:///llms.txt" },
            {
              label: "llms-full.txt",
              href: "pathname:///llms-full.txt",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Juspay Technologies.`,
    },

    prism: {
      theme: prismLightTheme,
      darkTheme: prismDarkTheme,
      additionalLanguages: [
        "bash",
        "diff",
        "json",
        "typescript",
        "javascript",
        "yaml",
      ],
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,

  // Plugins configuration
  plugins: [
    // Client-side redirects for legacy paths, SEO, and URL migrations
    redirectsPluginConfig,

    // Auto-detect new/modified docs via Git history for sidebar badges
    [
      "./plugins/docusaurus-plugin-new-docs",
      {
        mode: "both",
        docsDir: "docs",
        daysThreshold: 30,
        debug: process.env.NODE_ENV === "development",
      },
    ],

    // Local search index generation (fallback when Algolia is not configured)
    "./plugins/docusaurus-plugin-search-index",

    // Generate unique OG images per page at build time (satori + resvg)
    "./plugins/docusaurus-plugin-og-images",

    // Fix server bundle: handle Node-only native modules
    // (protobufjs from posthog→opentelemetry, ws from jsdom, fsevents, etc.)
    function serverExternalsPlugin() {
      return {
        name: "server-externals",
        configureWebpack(_config, isServer) {
          if (isServer) {
            return {
              externals: [
                /^(protobufjs|long|ws|bufferutil|utf-8-validate|fsevents)$/,
              ],
              module: {
                rules: [{ test: /\.node$/, use: "null-loader" }],
              },
            };
          }
          return {};
        },
      };
    },
  ],
};

export default config;
