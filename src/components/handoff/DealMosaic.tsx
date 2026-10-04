import styles from "@/app/handoff/handoff.module.css";
import { brands, type HandoffBrand } from "./brands";
import DealCard from "./DealCard";

function groupBrands(list: HandoffBrand[]) {
  const groups: { tag: string; brands: HandoffBrand[] }[] = [];
  for (const brand of list) {
    const current = groups[groups.length - 1];
    if (current && current.tag === brand.tag) current.brands.push(brand);
    else groups.push({ tag: brand.tag, brands: [brand] });
  }
  return groups;
}

function groupHeadingId(tag: string) {
  return `group-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export default function DealMosaic() {
  const groups = groupBrands(brands);

  return (
    <div className={styles.proof} aria-label="Example brands">
      {groups.map((group) => {
        const headingId = groupHeadingId(group.tag);
        return (
          <section key={group.tag} className={styles.proofGroup} aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.proofLabel}>
              {group.tag}
            </h2>
            <div className={styles.proofCards}>
              {group.brands.map((brand) => (
                <DealCard key={brand.id} brand={brand} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
