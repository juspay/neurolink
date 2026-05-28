type RevealOptions = {
  y?: number;
  x?: number;
  scale?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
  stagger?: number;
};

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
    stagger,
  } = options;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const translateY = isMobile ? Math.min(y, 30) : y;

  const targets = stagger
    ? (Array.from(node.children) as HTMLElement[])
    : [node];

  const cssDuration = `${duration}s`;
  const cssEase = "cubic-bezier(0.22, 1, 0.36, 1)";

  targets.forEach((el, i) => {
    (el as HTMLElement).style.opacity = String(opacity);
    (el as HTMLElement).style.transform =
      `translate(${x}px, ${translateY}px) scale(${scale})`;
    (el as HTMLElement).style.transition =
      `opacity ${cssDuration} ${cssEase}, transform ${cssDuration} ${cssEase}`;
    (el as HTMLElement).style.transitionDelay =
      `${delay + (stagger ? i * stagger : 0)}s`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          targets.forEach((el) => {
            (el as HTMLElement).style.opacity = "1";
            (el as HTMLElement).style.transform = "translate(0, 0) scale(1)";
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
