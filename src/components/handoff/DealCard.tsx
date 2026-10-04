import Image from "next/image";
import styles from "@/app/handoff/handoff.module.css";
import type { HandoffBrand } from "./brands";

const layoutClass = {
  featured: styles.dealCardFeatured,
  support: styles.dealCardSupport,
  row: styles.dealCardRow,
} as const;

export default function DealCard({ brand }: { brand: HandoffBrand }) {
  const featured = brand.layout === "featured";

  return (
    <button
      type="button"
      className={`${styles.dealCard} ${layoutClass[brand.layout]}`}
      data-open={brand.id}
      aria-haspopup="dialog"
      aria-controls={`drawer-${brand.id}`}
      aria-expanded="false"
    >
      <div className={styles.dealCardMedia}>
        {featured ? <span className={styles.dealCardBadge}>Featured</span> : null}
        <Image
          className={styles.dealCardImg}
          src={brand.heroSrc}
          alt={brand.heroAlt}
          fill
          sizes={featured ? "(max-width: 900px) 100vw, 66vw" : "(max-width: 900px) 100vw, 33vw"}
          preload={featured}
        />
      </div>
      <span className={styles.dealCardAccent} aria-hidden="true" />
      <div className={styles.dealCardLogoChip}>
        <Image
          className={styles.dealCardLogo}
          src={brand.logoSrc}
          alt={brand.logoAlt}
          width={brand.logoWidth}
          height={brand.logoHeight}
        />
      </div>
      <div className={styles.dealCardBody}>
        <span className={styles.dealCardTag}>{brand.tag}</span>
        <h3 className={styles.dealCardName}>{brand.name}</h3>
        <p className={styles.dealCardMeta}>{brand.meta}</p>
        <p className={styles.dealCardHook}>{brand.hook}</p>
        <p className={styles.dealCardTeaser}>{brand.teaser}</p>
        <span className={styles.dealCardCta}>
          Read writeup <span aria-hidden="true">→</span>
        </span>
      </div>
    </button>
  );
}
