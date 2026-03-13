<script lang="ts">
  import { reveal } from "$lib/actions/reveal";

  const columns = [
    {
      heading: "Documentation",
      links: [
        {
          label: "Getting Started",
          href: "https://docs.neurolink.ink/docs/getting-started",
        },
        {
          label: "SDK Reference",
          href: "https://docs.neurolink.ink/docs/sdk/api-reference",
        },
        {
          label: "CLI Guide",
          href: "https://docs.neurolink.ink/docs/cli/commands",
        },
        { label: "Examples", href: "https://docs.neurolink.ink/docs/examples" },
      ],
    },
    {
      heading: "Features",
      links: [
        {
          label: "MCP Integration",
          href: "https://docs.neurolink.ink/docs/mcp/overview",
        },
        {
          label: "Multimodal",
          href: "https://docs.neurolink.ink/docs/features/multimodal",
        },
        {
          label: "Streaming",
          href: "https://docs.neurolink.ink/docs/advanced/streaming",
        },
      ],
    },
    {
      heading: "Community",
      links: [
        { label: "GitHub", href: "https://github.com/juspay/neurolink" },
        {
          label: "Discussions",
          href: "https://github.com/juspay/neurolink/discussions",
        },
        { label: "Blog", href: "https://blog.neurolink.ink" },
        {
          label: "NPM Package",
          href: "https://www.npmjs.com/package/@juspay/neurolink",
        },
        { label: "Twitter", href: "https://twitter.com/jaborhey" },
        { label: "LinkedIn", href: "https://www.linkedin.com/company/juspay/" },
      ],
    },
    {
      heading: "More",
      links: [
        { label: "Juspay", href: "https://juspay.io" },
        {
          label: "Contributing",
          href: "https://github.com/juspay/neurolink/blob/release/CONTRIBUTING.md",
        },
        { label: "Full Docs Site", href: "https://docs.neurolink.ink" },
        { label: "llms.txt", href: "/llms.txt" },
      ],
    },
  ];
</script>

<footer
  class="footer border-t border-ds-border-subtle pt-8 md:pt-12 pb-6 md:pb-8 px-4 md:px-6"
>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 md:gap-8 max-w-[1200px] mx-auto"
    use:reveal={{ y: 30, stagger: 0.08 }}
  >
    {#each columns as col}
      <div>
        <h3
          class="text-xs font-semibold uppercase tracking-widest text-ds-text-primary mb-4"
        >
          {col.heading}
        </h3>
        <ul class="space-y-2.5">
          {#each col.links as link}
            <li>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                class="footer-link inline-flex items-center text-sm text-ds-text-muted hover:text-nl-accent transition-colors duration-150 overflow-hidden"
                style="min-height: 48px;"
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <div
    class="max-w-[1200px] mx-auto mt-12 pt-6 border-t border-ds-border-subtle"
  >
    <p class="text-xs text-ds-text-muted text-center">
      &copy; {new Date().getFullYear()} Juspay Technologies. Open source under MIT
      License.
    </p>
  </div>
</footer>

<style>
  @media (min-width: 1024px) {
    .footer-link {
      min-height: 0;
    }
  }

  @media (max-width: 767px) {
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      footer {
        padding-bottom: calc(2rem + env(safe-area-inset-bottom));
      }
    }
  }
</style>
