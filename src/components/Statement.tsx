"use client";

import { useEffect, useRef } from "react";

const words = ["ACCESS", "WHAT", "OTHERS", "CAN'T."];

export default function Statement() {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      el.querySelectorAll<HTMLElement>(".statement__word-inner").forEach((w) =>
        w.classList.add("revealed")
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll<HTMLElement>(".statement__word-inner").forEach(
              (inner, i) => {
                setTimeout(() => inner.classList.add("revealed"), i * 100);
              }
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="statement">
      <div className="statement__ghost" aria-hidden="true">
        BACKFIELD
      </div>
      <div className="statement__text" ref={textRef}>
        {words.map((word, i) => (
          <span key={word + i} className="statement__word">
            <span className="statement__word-inner">{word}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
