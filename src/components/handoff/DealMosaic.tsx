import styles from "@/app/handoff/handoff.module.css";
import { brands, type HandoffBrandId } from "./brands";
import DealCard from "./DealCard";

const sections: { id: string; title: string; ids: HandoffBrandId[] }[] = [
  { id: "apparel", title: "Apparel", ids: ["omorpho", "bandit", "halfdays"] },
  { id: "sports", title: "Sports", ids: ["lectra", "puntr", "growl"] },
  {
    id: "food-and-beverage",
    title: "Food and beverage",
    ids: ["kreatures", "foli", "parch", "unwind", "spade", "stillers", "drumroll", "lastcrumb"],
  },
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
          <div
            className={`${styles.proofCards} ${
              section.ids.length === 2 ? styles.proofCards2 : styles.proofCards3
            }`}
          >
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
