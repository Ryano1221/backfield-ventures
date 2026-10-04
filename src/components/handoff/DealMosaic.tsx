import styles from "@/app/handoff/handoff.module.css";
import { brands, type HandoffBrandId } from "./brands";
import DealCard from "./DealCard";

const sections: { id: string; title: string; ids: HandoffBrandId[] }[] = [
  { id: "sports", title: "Sports", ids: ["omorpho", "lectra", "puntr"] },
  { id: "food", title: "Food", ids: ["kreatures", "foli"] },
  { id: "drink", title: "Drink", ids: ["parch", "unwind"] },
];

export default function DealMosaic() {
  const byId = new Map(brands.map((brand) => [brand.id, brand]));

  return (
    <div className={styles.proof} aria-label="Example brands">
      {sections.map((section) => (
        <section key={section.id} className={styles.proofGroup} aria-labelledby={`group-${section.id}`}>
          <h2 id={`group-${section.id}`} className={styles.proofLabel}>
            {section.title}
          </h2>
          <div className={styles.proofCards}>
            {section.ids.map((id) => {
              const brand = byId.get(id);
              return brand ? <DealCard key={brand.id} brand={brand} /> : null;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
