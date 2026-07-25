"use client";

import anime from "animejs";
import { useEffect } from "react";

/* ===========================================================================
   Scroll reveal.

   One IntersectionObserver over every `.reveal` on the page, plus the two
   special cases the marketing pages use: counters that run up to a number, and
   SVG icons that draw themselves in the same line language as the hero.

   Renders nothing. Mount it once per page, after the content.
   =========================================================================== */

export function Reveals() {
  useEffect(() => {
    const reduced = document.documentElement.classList.contains("reduced");
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    if (reduced) {
      els.forEach((el) => {
        el.style.opacity = "1";
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);

          anime({
            targets: el,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 720,
            easing: "easeOutCubic",
          });

          /* Counters. `data-count` is the target, `data-dec` the decimals. */
          el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
            const target = Number.parseFloat(c.dataset.count ?? "0");
            const dec = Number(c.dataset.dec ?? 0);
            const value = { v: 0 };
            anime({
              targets: value,
              v: target,
              duration: 1400,
              easing: "easeOutExpo",
              update: () => {
                c.textContent = value.v.toFixed(dec);
              },
            });
          });

          /* Programme bars grow out of their start week. */
          el.querySelectorAll<HTMLElement>("[data-grow]").forEach((bar, i) => {
            bar.style.transformOrigin = "left center";
            anime({
              targets: bar,
              scaleX: [0, 1],
              duration: 780,
              delay: 120 + i * 130,
              easing: "easeOutQuart",
            });
          });

          /* Icons draw themselves, stroke by stroke. */
          el.querySelectorAll<SVGGeometryElement>(".draw-ic > *").forEach(
            (s, i) => {
              let len = 300;
              try {
                len = s.getTotalLength();
              } catch {
                /* Non-path geometry in some engines. The fallback is longer
                   than any stroke here, so it still draws on cleanly. */
              }
              s.style.strokeDasharray = String(len);
              s.style.strokeDashoffset = String(len);
              anime({
                targets: s,
                strokeDashoffset: 0,
                duration: 850,
                delay: i * 110,
                easing: "easeInOutSine",
              });
            },
          );
        });
      },
      { threshold: 0.2 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
