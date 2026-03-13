<script lang="ts">
  import { reveal } from "$lib/actions/reveal";

  const signals = [
    {
      icon: "shield",
      title: "Extracted from Production",
      description:
        "Built inside Juspay — processing enterprise-scale financial transactions. Not a weekend project.",
      accent: "var(--color-nl-sky)",
    },
    {
      icon: "code",
      title: "193K+ Lines of TypeScript",
      description:
        "447 source files. 269 tests. Deep investment in a comprehensive, type-safe SDK.",
      accent: "var(--color-nl-saffron)",
    },
    {
      icon: "lock-open",
      title: "MIT Open Source — Free Forever",
      description:
        "No vendor lock-in, no usage fees. You only pay for the AI provider API calls you make.",
      accent: "var(--color-nl-success)",
    },
    {
      icon: "package",
      title: "One Package. Everything Included.",
      description:
        "Providers + RAG + agents + voice + workflows + MCP — in a single npm install. No assembly required.",
      accent: "var(--color-nl-paprika)",
    },
  ];
</script>

<div class="section-ecosystem">
<section
  data-topology-phase="ecosystem"
  class="max-w-[1200px] mx-auto px-4 md:px-6 py-24 md:py-32"
>
  <div use:reveal={{ y: 40 }} class="text-center mb-8 md:mb-14">
    <p class="label-eyebrow mb-4">BUILT AT SCALE</p>
    <h2 class="headline-section font-display text-ds-text-primary">
      Production-tested AI SDK from Juspay
    </h2>
    <p class="mt-4 text-lg text-ds-text-tertiary max-w-2xl mx-auto">
      NeuroLink was extracted from production systems at Juspay, where it powers
      enterprise-scale AI workloads. Battle-tested, not theoretical.
    </p>
  </div>

  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    use:reveal={{ y: 40, stagger: 0.1 }}
  >
    {#each signals as signal}
      <div
        class="signal-card text-center"
        style="--card-accent: {signal.accent}"
      >
        <div class="signal-link" aria-hidden="true"></div>
        <div class="signal-node" aria-hidden="true"></div>
        {#if signal.icon === "shield"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mx-auto mb-3" style="color: {signal.accent}"
          >
            <path
              d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
            />
            <path d="m9 12 2 2 4-4" />
          </svg>
        {:else if signal.icon === "code"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mx-auto mb-3" style="color: {signal.accent}"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        {:else if signal.icon === "lock-open"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mx-auto mb-3" style="color: {signal.accent}"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mx-auto mb-3" style="color: {signal.accent}"
          >
            <path
              d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
            />
            <path d="M12 22V12" />
            <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
          </svg>
        {/if}

        <h3 class="text-sm font-semibold text-ds-text-primary mb-2">
          {signal.title}
        </h3>
        <p class="text-xs text-ds-text-tertiary leading-relaxed">
          {signal.description}
        </p>
      </div>
    {/each}
  </div>
</section>
</div>

<style>
  .signal-card {
    position: relative;
    margin-top: 1rem;
    border: 1px solid var(--color-ds-border);
    border-radius: var(--radius-ds-lg);
    padding: 1.25rem 1.25rem 1.4rem;
    background:
      radial-gradient(
        circle at 50% 0%,
        color-mix(in srgb, var(--card-accent) 12%, transparent) 0%,
        transparent 60%
      ),
      var(--color-ds-surface-2);
    transition:
      transform 0.32s var(--ease-spring),
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }

  .signal-card:hover {
    transform: translateY(-4px);
    border-color: color-mix(
      in srgb,
      var(--card-accent) 58%,
      var(--color-ds-border)
    );
    box-shadow:
      0 14px 34px rgba(0, 0, 0, 0.36),
      0 0 28px color-mix(in srgb, var(--card-accent) 20%, transparent);
  }

  .signal-link {
    position: absolute;
    top: -26px;
    left: 50%;
    width: 1.5px;
    height: 26px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--card-accent) 72%, #ffffff 28%)
    );
    opacity: 0.9;
  }

  .signal-node {
    position: absolute;
    top: -36px;
    left: 50%;
    width: 11px;
    height: 11px;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: radial-gradient(
      circle,
      #fff 0 33%,
      var(--card-accent) 34% 100%
    );
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--card-accent) 22%, transparent),
      0 0 15px color-mix(in srgb, var(--card-accent) 58%, transparent);
  }
</style>
