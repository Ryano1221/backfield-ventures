"use client";

import { useEffect, useRef } from "react";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cycleRef = useRef<HTMLSpanElement>(null);

  // ── Perspective field canvas (particles handled by global ParticleBackground)
  useEffect(() => {
    const maybeEl = canvasRef.current;
    if (!maybeEl) return;
    const maybeCx = maybeEl.getContext("2d");
    if (!maybeCx) return;
    // Rebind as definitely-typed for use inside closures
    const el: HTMLCanvasElement = maybeEl;
    const cx: CanvasRenderingContext2D = maybeCx;

    let raf: number;
    let W = 0, H = 0;
    let t = 0;

    const VP_Y = 0.42;
    const YARD_LINES = 12;
    const HASH_COLS = [0.28, 0.5, 0.72];

    function resize() {
      W = el.width = el.offsetWidth;
      H = el.height = el.offsetHeight;
    }

    function drawField() {
      const vpX = W * 0.5;
      const vpY = H * VP_Y;
      const bottom = H;

      cx.save();

      for (let i = 0; i < YARD_LINES; i++) {
        const tVal = i / (YARD_LINES - 1);
        const ease = tVal * tVal;
        const y = vpY + ease * (bottom - vpY);
        const spread = ease;
        const x0 = vpX + spread * (0 - vpX);
        const x1 = vpX + spread * (W - vpX);
        const alpha = 0.03 + ease * 0.08;

        cx.strokeStyle = `rgba(255,255,255,${alpha})`;
        cx.lineWidth = 0.8;
        cx.beginPath();
        cx.moveTo(x0, y);
        cx.lineTo(x1, y);
        cx.stroke();

        for (const hx of HASH_COLS) {
          const hashX = vpX + spread * (W * hx - vpX);
          const hashLen = ease * 12;
          cx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
          cx.lineWidth = 0.6;
          cx.beginPath();
          cx.moveTo(hashX, y - hashLen * 0.5);
          cx.lineTo(hashX, y + hashLen * 0.5);
          cx.stroke();
        }
      }

      for (const side of [0.05, 0.95]) {
        cx.strokeStyle = `rgba(255,255,255,0.06)`;
        cx.lineWidth = 1;
        cx.beginPath();
        cx.moveTo(vpX, vpY);
        cx.lineTo(W * side, bottom);
        cx.stroke();
      }

      const ezEase = 0.85 * 0.85;
      const ezY = vpY + 0.85 * (bottom - vpY);
      const ezX0 = vpX + ezEase * (0 - vpX);
      const ezX1 = vpX + ezEase * (W - vpX);
      cx.strokeStyle = `rgba(255,255,255,0.1)`;
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.moveTo(ezX0, ezY);
      cx.lineTo(ezX1, ezY);
      cx.stroke();

      cx.restore();
    }

    function drawVignette(timestamp: number) {
      const grad = cx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.75);
      const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.0008);
      const alpha = 0.06 + pulse * 0.03;
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, W, H);
    }

    function loop(timestamp: number) {
      t = timestamp;
      cx.clearRect(0, 0, W, H);
      drawVignette(t);
      drawField();
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(loop);
    });
    ro.observe(el);
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // ── Hero headline line reveal
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lines = document.querySelectorAll<HTMLElement>(".hero__line-inner");

    if (prefersReducedMotion) {
      lines.forEach((l) => l.classList.add("revealed"));
      return;
    }

    lines.forEach((line, i) => {
      setTimeout(() => line.classList.add("revealed"), 200 + i * 180);
    });
  }, []);

  // ── Cycling word (CONSUMER ↔ SPORTS)
  useEffect(() => {
    const el = cycleRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const words = ["CONSUMER", "SPORTS"];
    let idx = 0;

    const cycle = () => {
      el.classList.add("exit");
      setTimeout(() => {
        idx = (idx + 1) % words.length;
        el.textContent = words[idx];
        el.classList.remove("exit");
        el.classList.add("enter");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.add("active"));
        });
        setTimeout(() => el.classList.remove("enter", "active"), 350);
      }, 260);
    };

    const interval = setInterval(cycle, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero" id="home">
      <canvas ref={canvasRef} id="hero-canvas" aria-hidden="true" />

      <div className="hero__content">
        {/* Desktop: animated cycling headline */}
        <h2
          className="hero__headline hero__headline--desktop"
          aria-hidden="true"
        >
          <span className="hero__line hero__line--1">
            <span className="hero__line-inner">BEHIND THE NEXT</span>
          </span>
          <span className="hero__line hero__line--2">
            <span className="hero__line-inner">GENERATION OF</span>
          </span>
          <span className="hero__line hero__line--3">
            <span className="hero__line-inner">
              <span className="hero__cycle" ref={cycleRef}>CONSUMER</span>
            </span>
          </span>
        </h2>

        {/* Mobile: static headline */}
        <h2
          className="hero__headline hero__headline--mobile"
          aria-label="Behind the next generation of sports and consumer brands"
        >
          BEHIND THE NEXT GENERATION OF SPORTS AND CONSUMER BRANDS
        </h2>

        <div className="hero__ctas">
          <a href="mailto:hello@backfieldventures.com" className="btn btn--filled">
            SEND DECK
          </a>
          <a href="#focus" className="btn btn--outline">
            OUR FOCUS
          </a>
        </div>
      </div>
    </section>
  );
}
