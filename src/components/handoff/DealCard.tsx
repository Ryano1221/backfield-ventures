import Image from "next/image";
import styles from "@/app/handoff/handoff.module.css";
import type { HandoffBrand } from "./brands";

const layoutClass = {
  support: styles.dealCardSupport,
  row: styles.dealCardRow,
} as const;

export default function DealCard({ brand }: { brand: HandoffBrand }) {
  const contain = brand.imageFit === "contain";

  return (
    <button
      type="button"
      className={`${styles.dealCard} ${layoutClass[brand.layout]}`}
      data-open={brand.id}
      aria-haspopup="dialog"
      aria-controls={`drawer-${brand.id}`}
      aria-expanded="false"
    >
      <div className={`${styles.dealCardMedia} ${contain ? styles.dealCardMediaContain : ""}`}>
        <Image
          className={styles.dealCardImg}
          src={brand.heroSrc}
          alt={brand.heroAlt}
          fill
          sizes="(max-width: 900px) 100vw, 33vw"
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
          style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: 32 }}
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
