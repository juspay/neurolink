<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeSection } from "$lib/stores/canvasState";

  let heroEl: HTMLElement;
  let typeIntervalId: ReturnType<typeof setInterval> | null = null;
  let observer: IntersectionObserver;

  function typeInstallLine() {
    const el = heroEl?.querySelector<HTMLElement>(".hero-install");
    if (!el) return;
    const full = el.dataset.text ?? "";
    el.textContent = "";
    let i = 0;
    typeIntervalId = setInterval(() => {
      el.textContent = full.slice(0, ++i) + (i < full.length ? "█" : "");
      if (i >= full.length) {
        if (typeIntervalId) clearInterval(typeIntervalId);
        typeIntervalId = null;
      }
    }, 38);
  }

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) activeSection.set("hero");
      },
      { threshold: 0.4 },
    );
    observer.observe(heroEl);

    // Typewriter runs at ~2.3s (matches CSS animation timeline)
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = prefersReducedMotion
      ? null
      : setTimeout(typeInstallLine, 2300);
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  });

  onDestroy(() => {
    observer?.disconnect();
    if (typeIntervalId) clearInterval(typeIntervalId);
  });
</script>

<section
  bind:this={heroEl}
  data-topology-phase="hero"
  class="section-hero hero relative flex items-center justify-center min-h-dvh overflow-hidden"
>
  <!-- Legibility gradient — barely visible radial wash behind text -->
  <div
    class="absolute inset-0 pointer-events-none"
    style="background: radial-gradient(ellipse 72% 64% at 50% 50%, rgba(5,8,15,0.5) 0%, transparent 72%);"
    aria-hidden="true"
  ></div>

  <!-- Text layer -->
  <div
    class="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto mt-12 sm:mt-16 drop-shadow-xl"
  >
    <!-- Eyebrow label -->
    <p class="hero-label label-eyebrow mb-6 hero-anim-label">
      THE NERVOUS SYSTEM OF AI
    </p>

    <!-- Display headline — Instrument Serif italic -->
    <h1 class="hero-headline font-display mb-7">
      <span class="hero-word hero-anim-word" style="--d:0">The</span>
      <span class="hero-word hero-anim-word" style="--d:1">Nervous</span>
      <span class="hero-word hero-anim-word" style="--d:2">System</span>
      <span class="hero-word hero-anim-word" style="--d:3">for</span>
      <span class="hero-word hero-anim-word" style="--d:4">AI</span>
      <span class="hero-word hero-anim-word" style="--d:5">Streams.</span>
    </h1>

    <!-- Subtitle — canonical positioning line -->
    <p class="hero-sub body-text max-w-xl mx-auto mb-8 sm:mb-12 hero-anim-sub">
      NeuroLink is the signal layer for the AI nervous system, connecting live
      streams of tokens, data, tools, and context through pluggable connectors.
    </p>

    <!-- CTA row -->
    <div
      class="hero-cta-row flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-10 hero-anim-cta"
    >
      <a
        href="https://docs.neurolink.ink/docs/getting-started"
        class="btn-signal inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide rounded-full text-white"
      >
        <span class="hidden sm:inline">Connect to your first AI stream</span>
        <span class="sm:hidden">Get Started</span>
        <span aria-hidden="true">→</span>
      </a>
      <a
        href="https://github.com/juspay/neurolink"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm font-medium text-[var(--color-text-dim)] hover:text-white transition-colors"
      >
        View on GitHub
      </a>
    </div>

    <!-- Install line -->
    <div
      class="glass-panel inline-block px-4 py-2.5 sm:px-6 sm:py-3 rounded-full mb-6 sm:mb-10 hero-anim-install"
    >
      <code
        class="hero-install text-sm font-mono text-[var(--color-signal)]"
        data-text="npm install @juspay/neurolink"
      >
        npm install @juspay/neurolink
      </code>
    </div>

    <!-- Connector ecosystem chips -->
    <div
      class="flex items-center justify-center gap-3 mt-6 sm:gap-5 sm:mt-10 text-[11px] tracking-[0.12em] uppercase flex-wrap"
    >
      <span class="hidden sm:inline text-[rgba(168,216,255,0.30)]"
        >CONNECTORS / RECEPTORS</span
      >
      <a
        href="https://docs.neurolink.ink/docs/connectors/automatic"
        class="connector-chip text-[var(--color-nl-saffron)] hover:opacity-80 transition-opacity hero-anim-chip"
        style="--d:0">● automatic</a
      >
      <a
        href="https://docs.neurolink.ink/docs/connectors/tara"
        class="connector-chip text-[var(--color-nl-saffron)] hover:opacity-80 transition-opacity hero-anim-chip"
        style="--d:1">● tara</a
      >
      <a
        href="https://docs.neurolink.ink/docs/connectors/yama"
        class="connector-chip text-[var(--color-nl-paprika)] hover:opacity-80 transition-opacity hero-anim-chip"
        style="--d:2">● yama</a
      >
      <span class="text-[rgba(168,216,255,0.20)]">○ ···</span>
    </div>
  </div>
</section>

<style>
  @keyframes hero-fade-up {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Eyebrow label */
  .hero-anim-label {
    opacity: 0;
    animation: hero-fade-up 0.34s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
  }

  /* Headline words */
  .hero-word {
    display: inline-block;
  }

  .hero-anim-word {
    opacity: 0;
    animation: hero-fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1)
      calc(0.45s + var(--d, 0) * 0.05s) forwards;
  }

  /* Subtitle */
  .hero-anim-sub {
    opacity: 0;
    animation: hero-fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) 1s forwards;
  }

  /* CTA row */
  .hero-anim-cta {
    opacity: 0;
    animation: hero-fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) 1.3s forwards;
  }

  /* Install line */
  .hero-anim-install {
    opacity: 0;
    animation: hero-fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) 1.52s forwards;
  }

  /* Connector chips */
  .hero-anim-chip {
    opacity: 0;
    animation: hero-fade-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)
      calc(1.72s + var(--d, 0) * 0.07s) forwards;
  }

  /* Respect reduced motion — show everything immediately */
  @media (prefers-reduced-motion: reduce) {
    .hero-anim-label,
    .hero-anim-word,
    .hero-anim-sub,
    .hero-anim-cta,
    .hero-anim-install,
    .hero-anim-chip {
      opacity: 1;
      animation: none;
      transform: none;
    }
  }
</style>
