<script lang="ts">
  let mobileOpen = $state(false);
  let visible = $state(true);
  let scrolled = $state(false);
  let lastScroll = 0;

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
  }

  function closeMobile() {
    mobileOpen = false;
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
    onclick={toggleMobile}
    class="md:hidden flex items-center justify-center w-9 h-9 rounded-ds-md text-ds-text-tertiary hover:text-ds-text-primary hover:bg-ds-surface-3 transition-colors duration-200"
    aria-label="Toggle navigation menu"
    aria-expanded={mobileOpen}
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
{#if mobileOpen}
  <div class="fixed inset-0 z-40 md:hidden" role="presentation">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={closeMobile}
      aria-label="Close navigation menu"
      tabindex="-1"
    ></button>

    <!-- Panel -->
    <div
      class="absolute top-16 left-0 right-0 bg-ds-surface-1 border-b border-ds-border p-4 flex flex-col gap-1 animate-slide-up"
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
{/if}
