"use client";

import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subtle animated field-line canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle radial glow from center-top
      const grd = ctx.createRadialGradient(
        w * 0.5, h * 0.15, 0,
        w * 0.5, h * 0.15, w * 0.7
      );
      grd.addColorStop(0, "rgba(200,168,107,0.045)");
      grd.addColorStop(1, "rgba(200,168,107,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Horizontal field lines (very faint)
      const lineCount = 6;
      ctx.strokeStyle = "rgba(200,168,107,0.055)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < lineCount; i++) {
        const y = h * 0.3 + (h * 0.5 * i) / lineCount;
        const spread = (i / lineCount) * 0.35;
        ctx.beginPath();
        ctx.moveTo(w * (0.1 + spread), y);
        ctx.lineTo(w * (0.9 - spread), y);
        ctx.stroke();
      }

      // Center vertical axis line
      ctx.strokeStyle = "rgba(200,168,107,0.035)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.28);
      ctx.lineTo(w * 0.5, h * 0.82);
      ctx.stroke();

      // Corner arcs (stadium end zone feel)
      ctx.strokeStyle = "rgba(200,168,107,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.3, w * 0.28, 0, Math.PI, false);
      ctx.stroke();
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
        background: "var(--color-bg)",
      }}
    >
      {/* Field geometry canvas */}
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

      {/* Bottom gradient fade */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background:
            "linear-gradient(to bottom, transparent, var(--color-bg))",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          maxWidth: "820px",
          padding: "0 32px",
          paddingTop: "80px",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "40px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <span
            style={{
              display: "block",
              width: "32px",
              height: "1px",
              background: "var(--color-gold)",
              opacity: 0.6,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            Venture Capital
          </span>
          <span
            style={{
              display: "block",
              width: "32px",
              height: "1px",
              background: "var(--color-gold)",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(52px, 9vw, 96px)",
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
            marginBottom: "32px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          Backfield
          <br />
          <em
            style={{
              fontStyle: "italic",
              color: "var(--color-gold-light)",
              fontWeight: 300,
            }}
          >
            Ventures
          </em>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(20px, 3vw, 26px)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            marginBottom: "20px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          Behind the next generation of consumer and sports companies
        </p>

        {/* Supporting copy */}
        <p
          style={{
            fontSize: "15px",
            fontWeight: 400,
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            maxWidth: "520px",
            margin: "0 auto 52px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
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
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s",
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
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          opacity: mounted ? 0.4 : 0,
          transition: "opacity 1s ease 0.8s",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width: "1px",
            height: "40px",
            background:
              "linear-gradient(to bottom, var(--color-gold), transparent)",
          }}
        />
      </div>

      <style>{`
        .btn-primary {
          display: inline-block;
          padding: 14px 36px;
          background: var(--color-gold);
          color: #09090B;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .btn-primary:hover {
          background: var(--color-gold-light);
          transform: translateY(-1px);
        }
        .btn-secondary {
          display: inline-block;
          padding: 14px 36px;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          border-color: rgba(255,255,255,0.2);
          color: var(--color-text-primary);
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}
