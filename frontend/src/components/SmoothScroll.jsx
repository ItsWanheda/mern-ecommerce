import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SmoothScroll = () => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      // Keep carousels, dialogs and nested scroll areas on their native scroll behavior.
      prevent: (node) => Boolean(
        node?.closest?.(".overflow-x-auto, .overflow-y-auto, [data-lenis-prevent], [role='dialog']")
      ),
    });

    const syncScrollTrigger = () => ScrollTrigger.update();
    const tick = (time) => lenis.raf(time * 1000);

    lenis.on("scroll", syncScrollTrigger);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", syncScrollTrigger);
      gsap.ticker.remove(tick);
      lenis.destroy();
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, []);

  return null;
};

export default SmoothScroll;
