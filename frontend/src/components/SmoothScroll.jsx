import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SmoothScroll = () => {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    // Keep native touch scrolling on phones and tablets. Lenis is enabled only
    // for desktop pointer devices, where wheel smoothing is useful.
    if (reduceMotion || touchDevice) return undefined;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 0.78,
      // Horizontal product tracks, nested panels and dialogs keep native scrolling.
      prevent: (node) => Boolean(
        node?.closest?.(".overflow-x-auto, .overflow-y-auto, [data-lenis-prevent], [role='dialog']")
      ),
    });

    const syncScrollTrigger = () => ScrollTrigger.update();
    lenis.on("scroll", syncScrollTrigger);

    return () => {
      lenis.off("scroll", syncScrollTrigger);
      lenis.destroy();
    };
  }, []);

  return null;
};

export default SmoothScroll;
