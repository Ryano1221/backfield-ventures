"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "@/app/handoff/handoff.module.css";
import { brands, type HandoffBrandId } from "./brands";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isBrandId(value: string | null): value is HandoffBrandId {
  return brands.some((brand) => brand.id === value);
}

export default function HandoffDrawers() {
  const [openId, setOpenId] = useState<HandoffBrandId | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const opener = target.closest<HTMLElement>("[data-open]");
      const openerId = opener?.getAttribute("data-open") ?? null;
      if (opener && isBrandId(openerId)) {
        openerRef.current = opener;
        setOpenId(openerId);
        return;
      }

      if (target.closest("[data-close]")) {
        setOpenId(null);
        return;
      }

      const overlay = target.closest<HTMLElement>("[data-drawer]");
      if (overlay && target === overlay) setOpenId(null);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const lock = [
      document.getElementById("handoff-main"),
      document.getElementById("nav"),
      document.querySelector("footer.footer"),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);

    document.querySelectorAll<HTMLElement>("[data-open]").forEach((opener) => {
      opener.setAttribute("aria-expanded", opener.getAttribute("data-open") === openId ? "true" : "false");
    });

    if (!openId) {
      document.body.classList.remove("handoff-drawer-open");
      lock.forEach((el) => el.removeAttribute("inert"));
      if (wasOpen.current) openerRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    document.body.classList.add("handoff-drawer-open");
    lock.forEach((el) => el.setAttribute("inert", ""));
    const drawer = document.getElementById(`drawer-${openId}`);
    drawer?.querySelector<HTMLElement>("[data-close]")?.focus();

    return () => {
      document.body.classList.remove("handoff-drawer-open");
      lock.forEach((el) => el.removeAttribute("inert"));
    };
  }, [openId]);

  useEffect(() => {
    if (!openId) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenId(null);
        return;
      }
      if (event.key !== "Tab") return;

      const panel = document
        .getElementById(`drawer-${openId}`)
        ?.querySelector<HTMLElement>("[data-panel]");
      if (!panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  return (
    <div id="drawers">
      {brands.map((brand) => {
        const open = openId === brand.id;
        return (
          <div
            key={brand.id}
            className={styles.drawer}
            id={`drawer-${brand.id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`title-${brand.id}`}
            aria-hidden={open ? undefined : true}
            hidden={!open}
            data-drawer
          >
            <div className={styles.drawerPanel} data-panel>
              <button type="button" className={styles.drawerClose} data-close aria-label="Close">
                Close
              </button>
              <div className={styles.drawerHero}>
                <Image
                  className={styles.drawerHeroImg}
                  src={brand.heroSrc}
                  alt=""
                  fill
                  sizes="560px"
                />
              </div>
              <div className={styles.drawerLogoBand}>
                <Image
                  className={styles.drawerLogo}
                  src={brand.logoSrc}
                  alt=""
                  width={brand.logoWidth}
                  height={brand.logoHeight}
                />
              </div>
              <span className={styles.dealCardTag}>{brand.tag}</span>
              <h2 id={`title-${brand.id}`} className={styles.drawerTitle}>
                {brand.name}
              </h2>
              <p className={styles.dealCardMeta}>{brand.meta}</p>
              <div className={styles.drawerProse}>
                {brand.writeup.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <a className={styles.btn} href={brand.siteUrl} target="_blank" rel="noopener noreferrer">
                Visit public site <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
