<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeSection } from "$lib/stores/canvasState";
  import { tilt } from "../actions/tilt.js";

  let sectionEl: HTMLElement;
  let observer: IntersectionObserver;
  let isMobile = $state(false);
  let expandedCard = $state(-1);
  let resizeHandler: (() => void) | undefined;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) activeSection.set("connectors");
      },
      { threshold: 0.4 },
    );
    observer.observe(sectionEl);

    const checkMobile = () => {
      isMobile = window.innerWidth < 768;
    };
    checkMobile();
    resizeHandler = checkMobile;
    window.addEventListener("resize", resizeHandler);
  });

  onDestroy(() => {
    observer?.disconnect();
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  });

  const CONNECTORS = [
    {
      name: "Automatic",
      description:
        "Consumer analysis and operations hub. Routes order data and payment context through the signal layer to surface risk signals and recommendations.",
      gateway: "Consumer control · Operations intelligence",
      accentColor: "var(--color-nl-saffron)",
      docsUrl: "/docs/connectors/automatic",
    },
    {
      name: "Tara",
      description:
        "Self-evolving AI assistant. Receives Slack events, uses MCP tools to answer from code and docs, and improves itself through task loops.",
      gateway: "Engineering assistance · Self-improvement",
      accentColor: "var(--color-nl-saffron)",
      docsUrl: "/docs/connectors/tara",
    },
    {
      name: "Yama",
      description:
        "Code review judge. Streams PR diffs through the signal layer, applies rule-driven analysis, and enforces quality gates before merge.",
      gateway: "Code quality · Automated governance",
      accentColor: "var(--color-nl-paprika)",
      docsUrl: "/docs/connectors/yama",
    },
  ];
</script>

<section
  bind:this={sectionEl}
  data-topology-phase="connectors"
  class="section-connectors py-24 md:py-36 relative"
>
  <div class="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
    <p class="label-eyebrow text-[var(--color-nl-accent-lighter)] mb-4">
      CONNECTORS
    </p>
    <h2 class="headline-section font-display text-white mb-6 drop-shadow-lg">
      Organs built on the stream layer.
    </h2>
    <p class="body-text text-[var(--color-text-body)] text-lg max-w-xl mb-16">
      Every application built on NeuroLink is an organ. It connects to the
      vascular layer and opens a gateway — a new way for people to access and
      experience AI.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each CONNECTORS as c, i}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          use:tilt
          class="connector-card glass-panel glass-panel-hover"
          class:connector-card--expanded={isMobile && expandedCard === i}
          style="--card-accent: {c.accentColor}"
          onclick={() => {
            if (isMobile) expandedCard = expandedCard === i ? -1 : i;
          }}
          onkeydown={(e) => {
            if (isMobile && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              expandedCard = expandedCard === i ? -1 : i;
            }
          }}
          role={isMobile ? "button" : undefined}
          tabindex={isMobile ? 0 : -1}
          aria-expanded={isMobile ? expandedCard === i : undefined}
        >
          <div class="connector-link" aria-hidden="true"></div>
          <div class="connector-node" aria-hidden="true"></div>
          <div class="card-accent-bar"></div>
          <div class="card-body">
            <div class="flex items-center justify-between mb-8">
              <span
                class="text-[11px] font-[600] tracking-[0.15em] uppercase"
                style="color: {c.accentColor}; text-shadow: 0 0 10px {c.accentColor};"
                >● connected</span
              >
              <span
                class="text-[10px] tracking-[0.1em] text-[var(--color-text-dim)] uppercase"
                >organ</span
              >
            </div>
            <h3
              class="font-display text-[2rem] text-white mb-4 drop-shadow-md"
              style="font-size: clamp(1.5rem, 4vw, 2.2rem); line-height: 1.1;"
            >
              {c.name}
            </h3>
            {#if !isMobile || expandedCard === i}
              <p
                class="text-[0.9rem] leading-[1.7] text-[var(--color-text-body)] mb-8"
              >
                {c.description}
              </p>
            {/if}
            <p
              class="text-[11px] tracking-[0.1em] font-medium text-[var(--color-nl-sky)] uppercase"
            >
              {c.gateway}
            </p>
          </div>
          <div class="card-footer">
            <a
              href={c.docsUrl}
              class="text-[13px] font-medium text-[var(--color-text-dim)] hover:text-white transition-colors"
            >
              View connector docs <span
                aria-hidden="true"
                class="ml-1 text-[var(--color-nl-sky)]">→</span
              >
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .connector-card {
    display: flex;
    flex-direction: column;
    will-change: transform;
    overflow: hidden;
    position: relative;
    margin-top: 1.25rem;
  }

  .connector-link {
    position: absolute;
    left: 50%;
    top: -30px;
    width: 1.5px;
    height: 30px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--card-accent) 80%, #ffffff 20%)
    );
    opacity: 0.85;
    filter: drop-shadow(0 0 6px var(--card-accent));
  }

  .connector-node {
    position: absolute;
    left: 50%;
    top: -40px;
    width: 12px;
    height: 12px;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: radial-gradient(
      circle,
      #fff 0 28%,
      var(--card-accent) 30% 100%
    );
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--card-accent) 20%, transparent),
      0 0 14px color-mix(in srgb, var(--card-accent) 70%, transparent);
  }

  .card-accent-bar {
    height: 3px;
    background: linear-gradient(to right, var(--card-accent), transparent);
    opacity: 0.9;
    box-shadow: 0 0 15px var(--card-accent);
  }

  .card-body {
    padding: 1.5rem 1.25rem 1.25rem;
    flex: 1;
  }

  @media (min-width: 768px) {
    .card-body {
      padding: 2.25rem 2rem 1.5rem;
    }
  }

  .card-footer {
    padding: 1.25rem 1.25rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 767px) {
    .connector-link,
    .connector-node {
      display: none;
    }
    .connector-card {
      margin-top: 0;
      cursor: pointer;
    }
    .connector-card--expanded {
      border-color: rgba(0, 240, 255, 0.25);
      background: var(--color-ds-surface-hover);
    }
  }
</style>
