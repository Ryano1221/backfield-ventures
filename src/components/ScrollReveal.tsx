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

    // Hard fallback: reveal everything after 2.5 s no matter what
    const fallback = setTimeout(() => {
      els.forEach((el) => el.classList.add("is-visible"));
    }, 2500);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      // Low threshold + no negative margin = fires as soon as element peeks in
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
