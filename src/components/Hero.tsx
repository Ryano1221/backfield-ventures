"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subtle stadium field geometry on a light background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Stadium arc (top-center) — like the logo's arch
      ctx.strokeStyle = "rgba(29, 103, 188, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * -0.2, w * 0.65, 0, Math.PI, false);
      ctx.stroke();

      ctx.strokeStyle = "rgba(29, 103, 188, 0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * -0.1, w * 0.55, 0, Math.PI, false);
      ctx.stroke();

      // Field horizontal lines — evenly spaced, converging toward center (perspective)
      const lineCount = 8;
      for (let i = 0; i < lineCount; i++) {
        const t = i / lineCount;
        const y = h * 0.5 + t * h * 0.55;
        const xPad = w * 0.08 + t * w * 0.12;
        ctx.strokeStyle = `rgba(29, 103, 188, ${0.045 - t * 0.004})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(xPad, y);
        ctx.lineTo(w - xPad, y);
        ctx.stroke();
      }

      // Two red accent lines at bottom — field stripe echo
      ctx.strokeStyle = "rgba(204, 43, 51, 0.09)";
      ctx.lineWidth = 1.5;
      const ry1 = h * 0.82;
      const ry2 = h * 0.87;
      const rPad = w * 0.15;
      ctx.beginPath();
      ctx.moveTo(rPad, ry1);
      ctx.lineTo(w - rPad, ry1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rPad * 1.4, ry2);
      ctx.lineTo(w - rPad * 1.4, ry2);
      ctx.stroke();

      // Vertical center axis
      ctx.strokeStyle = "rgba(29, 103, 188, 0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.45);
      ctx.lineTo(w * 0.5, h * 0.9);
      ctx.stroke();
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, []);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      {/* Canvas geometry */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Bottom gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "100px",
          zIndex: 1,
          background: "linear-gradient(to bottom, transparent, var(--color-surface))",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          maxWidth: "720px",
          padding: "0 40px",
          paddingTop: "96px",
        }}
      >


        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "36px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 0.65s ease 0.08s, transform 0.65s ease 0.08s",
          }}
        >
          <Image
            src="/logo.png"
            alt="Backfield Ventures"
            width={2000}
            height={1333}
            style={{
              objectFit: "contain",
              width: "clamp(240px, 28vw, 360px)",
              height: "auto",
            }}
            priority
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-montserrat), system-ui, sans-serif",
            fontSize: "clamp(16px, 2.2vw, 22px)",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            letterSpacing: "0.01em",
            marginBottom: "16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s ease 0.18s, transform 0.65s ease 0.18s",
          }}
        >
          Behind the next generation of consumer and sports companies
        </p>

        {/* Sub-copy */}
        <p
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--color-text-muted)",
            lineHeight: 1.75,
            maxWidth: "500px",
            margin: "0 auto 48px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s ease 0.35s, transform 0.65s ease 0.35s",
          }}
        >
          We invest in founders building iconic consumer brands and sports
          platforms — from the earliest stages through Series A.
        </p>

        {/* CTAs */}
        <div
          className="hero-ctas"
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s ease 0.45s, transform 0.65s ease 0.45s",
          }}
        >
          <a href="#contact" className="btn-primary">
            Reach Out
          </a>
          <a href="#focus" className="btn-secondary">
            Our Focus
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          opacity: mounted ? 0.5 : 0,
          transition: "opacity 1s ease 1s",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width: "1.5px",
            height: "36px",
            background: "linear-gradient(to bottom, var(--color-blue), transparent)",
            borderRadius: "1px",
          }}
        />
      </div>
    </section>
  );
}
