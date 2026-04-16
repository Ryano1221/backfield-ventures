"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const maybeEl = canvasRef.current;
    if (!maybeEl) return;
    const maybeCx = maybeEl.getContext("2d");
    if (!maybeCx) return;
    const el: HTMLCanvasElement = maybeEl;
    const cx: CanvasRenderingContext2D = maybeCx;

    let raf: number;
    let W = 0, H = 0;
    let particles: {
      x: number; y: number; r: number;
      vx: number; vy: number;
      opacity: number; flicker: number; flickerSpeed: number;
    }[] = [];

    function buildParticles() {
      particles = [];
      const count = Math.min(Math.floor(W * H / 4000), 220);
      for (let i = 0; i < count; i++) particles.push(makeParticle(true));
    }

    function makeParticle(random: boolean) {
      return {
        x: Math.random() * W,
        y: random ? Math.random() * H : H + 5,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.3 + 0.06),
        opacity: Math.random() * 0.4 + 0.1,
        flicker: Math.random() * Math.PI * 2,
        flickerSpeed: Math.random() * 0.015 + 0.004,
      };
    }

    function resize() {
      W = el.width = el.offsetWidth;
      H = el.height = el.offsetHeight;
      buildParticles();
    }

    function loop() {
      cx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.flicker += p.flickerSpeed;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) Object.assign(p, makeParticle(false));
        const alpha = p.opacity * (0.5 + 0.5 * Math.sin(p.flicker));
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = `rgba(255,255,255,${alpha})`;
        cx.fill();
      }
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

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      aria-hidden="true"
    />
  );
}
