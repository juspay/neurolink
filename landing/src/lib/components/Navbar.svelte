<script lang="ts">
  import { tick } from "svelte";

  let mobileOpen = $state(false);
  let visible = $state(true);
  let scrolled = $state(false);
  let lastScroll = 0;
  let mobileToggleButton: HTMLButtonElement | null = null;

  const navLinks = [
    { label: "Docs", href: "https://docs.neurolink.ink/docs/getting-started" },
    { label: "SDK", href: "https://docs.neurolink.ink/docs/sdk/api-reference" },
    { label: "CLI", href: "https://docs.neurolink.ink/docs/cli/commands" },
    { label: "Blog", href: "https://blog.neurolink.ink" },
    { label: "GitHub", href: "https://github.com/juspay/neurolink" },
  ];

  function handleScroll() {
    const current = Math.max(0, window.scrollY);
    visible = current < lastScroll || current < 100;
    scrolled = current > 100;
    lastScroll = current;
  }

  function toggleMobile() {
    mobileOpen = !mobileOpen;
    if (mobileOpen) {
      tick().then(() => {
        if (!mobileOpen) return;
        const firstLink = document.querySelector("#mobile-nav-panel a");
        if (firstLink instanceof HTMLElement) {
          firstLink.focus();
        }
      });
    }
  }

  function closeMobile() {
    const wasOpen = mobileOpen;
    mobileOpen = false;
    if (wasOpen) {
      tick().then(() => mobileToggleButton?.focus());
    }
  }

  $effect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = mobileOpen ? "hidden" : "";
      return () => {
        document.body.style.overflow = "";
      };
    }
  });
</script>

<svelte:window
  onscroll={handleScroll}
  onkeydown={(e) => {
    if (e.key === "Escape" && mobileOpen) closeMobile();
  }}
/>

<nav
  class="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 border-b transition-all duration-400"
  class:translate-y-0={visible}
  class:-translate-y-full={!visible}
  class:border-transparent={!scrolled}
  class:border-ds-border={scrolled}
  style:background={scrolled ? "rgba(10, 10, 10, 0.85)" : "transparent"}
  style:backdrop-filter={scrolled ? "blur(24px)" : "none"}
  style:-webkit-backdrop-filter={scrolled ? "blur(24px)" : "none"}
>
  <!-- Logo -->
  <a href="/" class="flex items-center gap-2.5 shrink-0">
    <img src="/icons/brain.svg" alt="NeuroLink" class="w-8 h-8 rounded-lg" />
    <span class="font-bold text-lg tracking-tight">
      <span class="text-white">Neuro</span><span class="text-nl-saffron"
        >Link</span
      >
    </span>
  </a>

  <!-- Desktop nav links -->
  <div class="hidden md:flex items-center gap-1">
    {#each navLinks as link}
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        class="px-3 py-1.5 text-sm text-ds-text-tertiary hover:text-ds-text-primary rounded-ds-md transition-colors duration-200"
      >
        {link.label}
      </a>
    {/each}
  </div>

  <!-- Desktop CTA -->
  <div class="hidden md:flex items-center gap-3">
    <!-- GitHub Stars Badge -->
    <a
      href="https://github.com/juspay/neurolink"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ds-text-tertiary border border-ds-border hover:border-ds-border-hover hover:text-ds-text-primary rounded-ds-full transition-colors duration-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="text-nl-saffron"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
      Star
    </a>
    <a
      href="https://docs.neurolink.ink/docs/getting-started"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-nl-accent hover:bg-nl-accent-dark rounded-ds-full transition-colors duration-200"
    >
      Get Started
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </a>
  </div>

  <!-- Mobile hamburger -->
  <button
    bind:this={mobileToggleButton}
    onclick={toggleMobile}
    class="md:hidden flex items-center justify-center w-11 h-11 rounded-ds-md text-ds-text-tertiary hover:text-ds-text-primary hover:bg-ds-surface-3 transition-colors duration-200"
    aria-label="Toggle navigation menu"
    aria-expanded={mobileOpen}
    aria-controls="mobile-nav-panel"
  >
    {#if mobileOpen}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    {/if}
  </button>
</nav>

<!-- Mobile menu overlay -->
<div
  class="fixed inset-0 z-40 md:hidden transition-opacity duration-200"
  class:opacity-0={!mobileOpen}
  class:pointer-events-none={!mobileOpen}
  class:opacity-100={mobileOpen}
  role="presentation"
  inert={!mobileOpen}
>
  <!-- Backdrop -->
  <button
    class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    onclick={closeMobile}
    aria-label="Close navigation menu"
    tabindex="-1"
  ></button>

  <!-- Panel -->
  <div
    id="mobile-nav-panel"
    class="absolute top-16 left-0 right-0 bg-ds-surface-1 border-b border-ds-border p-4 flex flex-col gap-1 max-h-[calc(100dvh-4rem)] overflow-y-auto transition-all duration-200"
    class:translate-y-0={mobileOpen}
    class:-translate-y-2={!mobileOpen}
  >
    {#each navLinks as link}
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onclick={closeMobile}
        class="px-4 py-3 text-sm text-ds-text-tertiary hover:text-ds-text-primary hover:bg-ds-surface-3 rounded-ds-md transition-colors duration-200"
      >
        {link.label}
      </a>
    {/each}

    <div class="mt-2 pt-3 border-t border-ds-border">
      <a
        href="https://docs.neurolink.ink/docs/getting-started"
        target="_blank"
        rel="noopener noreferrer"
        onclick={closeMobile}
        class="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-nl-accent hover:bg-nl-accent-dark rounded-ds-full transition-colors duration-200"
      >
        Get Started
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </a>
    </div>
  </div>
</div>
