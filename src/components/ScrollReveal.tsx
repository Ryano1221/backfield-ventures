"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".reveal-bottom, .reveal-left, .reveal-right"
      )
    );

    // If reduced motion, show everything immediately without the js-ready class
    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    // Mark body so CSS hides elements — only now do reveals kick in
    document.body.classList.add("js-ready");

    // Force a synchronous layout so the browser actually paints opacity:0
    // BEFORE the IntersectionObserver fires. Without this the browser may
    // batch the hide + show into one frame and skip the transition entirely.
    void document.body.getBoundingClientRect();

    // Hard fallback: reveal everything after 2 s no matter what
    const fallback = setTimeout(() => {
      els.forEach((el) => el.classList.add("is-visible"));
    }, 2000);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px" }
    );

    els.forEach((el) => observer.observe(el));

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
      document.body.classList.remove("js-ready");
    };
  }, []);

  return null;
}
