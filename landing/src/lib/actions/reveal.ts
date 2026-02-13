interface RevealOptions {
  y?: number;
  x?: number;
  scale?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
  stagger?: number;
}

let registered = false;

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { destroy() {} };
  }

  const {
    y = 60,
    x = 0,
    scale = 1,
    opacity = 0,
    duration = 0.8,
    delay = 0,
    ease = "power3.out",
    start = "top 85%",
    stagger,
  } = options;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  if (isMobile) {
    const mobileY = Math.min(y, 30);
    const targets = stagger
      ? (Array.from(node.children) as HTMLElement[])
      : [node];
    const cssDuration = `${duration}s`;
    const cssEase = "cubic-bezier(0.22, 1, 0.36, 1)";

    targets.forEach((el, i) => {
      el.style.opacity = String(opacity);
      el.style.transform = `translate(${x}px, ${mobileY}px) scale(${scale})`;
      el.style.transition = `opacity ${cssDuration} ${cssEase}, transform ${cssDuration} ${cssEase}`;
      el.style.transitionDelay = `${delay + (stagger ? i * stagger : 0)}s`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            targets.forEach((el) => {
              el.style.opacity = "1";
              el.style.transform = "translate(0, 0) scale(1)";
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  // Desktop: GSAP ScrollTrigger path (unchanged)
  let tween: any;

  (async () => {
    const { gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    const target = stagger ? node.children : node;

    tween = gsap.from(target, {
      y,
      x,
      scale,
      opacity,
      duration,
      delay,
      ease,
      stagger: stagger || 0,
      scrollTrigger: { trigger: node, start, once: true },
    });
  })();

  return {
    destroy() {
      tween?.scrollTrigger?.kill();
      tween?.kill();
    },
  };
}
