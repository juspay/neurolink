<script lang="ts">
  import { onMount } from "svelte";

  const featureLabels = [
    {
      name: "Agents",
      color: "#ff9505",
      top: "0",
      left: "50%",
      tx: "-50%",
      ty: "-4px",
    },
    {
      name: "MCP",
      color: "#ec4e20",
      top: "12%",
      right: "0",
      tx: "8px",
      ty: "0",
    },
    {
      name: "RAG",
      color: "#a855f7",
      top: "50%",
      right: "0",
      tx: "16px",
      ty: "-50%",
    },
    {
      name: "Memory",
      color: "#ec4899",
      bottom: "12%",
      right: "0",
      tx: "8px",
      ty: "0",
    },
    {
      name: "Workflows",
      color: "#016fb9",
      bottom: "0",
      left: "50%",
      tx: "-50%",
      ty: "4px",
    },
    {
      name: "Voice",
      color: "#06b6d4",
      bottom: "12%",
      left: "0",
      tx: "-8px",
      ty: "0",
    },
    {
      name: "Streaming",
      color: "#22c55e",
      top: "50%",
      left: "0",
      tx: "-16px",
      ty: "-50%",
    },
    {
      name: "Evals",
      color: "#ff9505",
      top: "12%",
      left: "0",
      tx: "-8px",
      ty: "0",
    },
  ];

  let heroEl: HTMLElement;

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: any;
    let destroyed = false;

    (async () => {
      const { gsap } = await import("gsap");

      if (destroyed) return;

      const q = (sel: string) => heroEl.querySelector(sel);
      const qa = (sel: string) => heroEl.querySelectorAll(sel);

      ctx = gsap.matchMedia();

      // Mobile: lighter timeline — fewer tweens, smaller offsets, faster
      ctx.add("(max-width: 767px)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(
          q("[data-hero-badge]"),
          { y: 20, opacity: 0, duration: 0.5 },
          0.1,
        )
          .from(
            q("[data-hero-headline]"),
            { y: 25, opacity: 0, duration: 0.6 },
            0.25,
          )
          .from(
            q("[data-hero-subtitle]"),
            { y: 20, opacity: 0, duration: 0.5 },
            0.4,
          )
          .from(
            q("[data-hero-cta]"),
            { y: 20, opacity: 0, duration: 0.5 },
            0.55,
          )
          .from(
            q("[data-hero-pills]"),
            { y: 15, opacity: 0, duration: 0.6 },
            0.7,
          );
      });

      // Desktop: full timeline with brain, labels, scroll indicator
      ctx.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(
          q("[data-hero-badge]"),
          { y: 30, opacity: 0, duration: 0.6 },
          0.2,
        )
          .from(
            q("[data-hero-headline]"),
            { y: 40, opacity: 0, duration: 0.7 },
            0.4,
          )
          .from(
            q("[data-hero-subtitle]"),
            { y: 30, opacity: 0, duration: 0.6 },
            0.6,
          )
          .from(q("[data-hero-cta]"), { y: 30, opacity: 0, duration: 0.6 }, 0.8)
          .from(
            q("[data-hero-brain]"),
            { scale: 0.9, opacity: 0, duration: 0.8, ease: "power2.out" },
            0.6,
          )
          .from(
            qa("[data-hero-label]"),
            { scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.08 },
            1.0,
          )
          .from(q("[data-hero-scroll]"), { opacity: 0, duration: 0.5 }, 1.4);
      });
    })();

    return () => {
      destroyed = true;
      ctx?.revert();
    };
  });
</script>

<section
  bind:this={heroEl}
  class="relative min-h-screen pt-16 md:pt-24 pb-16 px-4 md:px-6 flex items-center max-w-[1400px] mx-auto overflow-hidden"
>
  <!-- Desktop: Gradient mesh background -->
  <div class="hero-bg pointer-events-none hidden md:block"></div>

  <!-- Mobile: Aurora animated background -->
  <div class="hero-aurora md:hidden">
    <div class="hero-aurora-blob hero-aurora-blob--blue"></div>
    <div class="hero-aurora-blob hero-aurora-blob--orange"></div>
    <div class="hero-aurora-blob hero-aurora-blob--purple"></div>
  </div>

  <div
    class="relative grid grid-cols-1 lg:grid-cols-5 gap-12 items-center w-full"
  >
    <!-- Left Content (60%) -->
    <div class="lg:col-span-3 space-y-6 md:space-y-8">
      <!-- Badge -->
      <div
        data-hero-badge
        class="inline-flex items-center gap-2 rounded-full border border-ds-border bg-ds-surface-2 px-4 py-1.5 text-sm"
      >
        <span class="text-ds-text-tertiary">Production-Ready</span>
        <span class="text-ds-text-muted">|</span>
        <span class="text-nl-accent font-medium">v9.4+</span>
      </div>

      <!-- Heading -->
      <h1 data-hero-headline class="hero-headline">
        <span class="text-ds-text-primary">The Complete TypeScript</span>
        <br />
        <span
          class="bg-gradient-to-r from-nl-accent to-nl-accent-lighter bg-clip-text text-transparent"
        >
          AI SDK
        </span>
      </h1>

      <!-- Subtitle -->
      <p
        data-hero-subtitle
        class="text-base md:text-lg text-ds-text-tertiary max-w-xl leading-relaxed"
      >
        Unified access to 13+ AI providers through a single TypeScript SDK. Ship
        agents, workflows, RAG pipelines, and voice apps with battle-tested
        infrastructure extracted from production systems.
      </p>

      <!-- CTA Button -->
      <div data-hero-cta>
        <a
          href="https://docs.neurolink.ink/docs/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center flex-wrap sm:flex-nowrap rounded-full border border-ds-border bg-ds-surface-3 hover:border-ds-border-hover hover:bg-ds-surface-4 transition-all duration-200"
        >
          <span class="px-5 py-3 text-sm font-medium text-ds-text-primary">
            Get Started
          </span>
          <span class="w-px h-8 bg-ds-border hidden sm:block"></span>
          <span
            class="hidden sm:inline px-5 py-3 text-sm font-mono text-ds-text-tertiary group-hover:text-ds-text-secondary transition-colors"
          >
            npm install @juspay/neurolink
          </span>
        </a>
      </div>

      <!-- Mobile: Floating feature pills -->
      <div data-hero-pills class="flex flex-wrap gap-2 pt-2 lg:hidden">
        {#each featureLabels as label, i}
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ds-surface-2/80 border text-xs font-medium backdrop-blur-sm"
            style:border-color="{label.color}25"
            style:color={label.color}
            style:animation="pill-float-{(i % 3) + 1}
            {3 + (i % 3)}s ease-in-out {i * 0.3}s infinite"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              style:background={label.color}
            ></span>
            {label.name}
          </span>
        {/each}
      </div>
    </div>

    <!-- Right Illustration (40%) -->
    <div class="hidden lg:flex lg:col-span-2 items-center justify-center">
      <div class="relative w-full max-w-[460px] aspect-square animate-float">
        <!-- Central brain icon -->
        <div
          data-hero-brain
          class="absolute inset-[15%] flex items-center justify-center"
        >
          <img
            src="/icons/brain.svg"
            alt="NeuroLink Brain"
            class="w-full h-full drop-shadow-[0_0_40px_rgba(1,111,185,0.3)]"
          />
        </div>

        <!-- Feature labels orbiting the brain -->
        {#each featureLabels as label}
          <div
            data-hero-label
            class="absolute"
            style:top={label.top}
            style:bottom={label.bottom}
            style:left={label.left}
            style:right={label.right}
            style:transform="translate({label.tx}, {label.ty})"
          >
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nl-charcoal/80 border text-xs font-medium backdrop-blur-sm"
              style:border-color="{label.color}30"
              style:color={label.color}
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                style:background={label.color}
              ></span>
              {label.name}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Scroll indicator -->
  <div
    data-hero-scroll
    class="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2"
  >
    <span class="text-xs text-ds-text-muted tracking-widest uppercase"
      >Scroll</span
    >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-ds-text-muted animate-bounce-down"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
</section>
