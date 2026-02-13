<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import Navbar from "$lib/components/Navbar.svelte";

  const { children } = $props();

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: any;
    let gsapRef: any;
    let onTick: any;
    let destroyed = false;

    (async () => {
      const { default: Lenis } = await import("lenis");
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");

      if (destroyed) return;

      gsapRef = gsap;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      const isDesktop = window.innerWidth >= 1024;

      if (isDesktop) {
        lenis = new Lenis({ lerp: 0.1, duration: 1.2 });
        lenis.on("scroll", ScrollTrigger.update);
        onTick = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(onTick);
        gsap.ticker.lagSmoothing(0);
      }
    })();

    return () => {
      destroyed = true;
      lenis?.destroy();
      if (gsapRef && onTick) gsapRef.ticker.remove(onTick);
    };
  });
</script>

<svelte:head>
  <title>NeuroLink - The Enterprise AI SDK for Production Applications</title>
  <meta
    name="description"
    content="Unified access to 13+ AI providers through a single TypeScript SDK. Battle-tested at enterprise scale."
  />
</svelte:head>

<Navbar />
<main class="pt-16">
  {@render children()}
</main>
