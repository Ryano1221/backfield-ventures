import styles from "@/app/handoff/handoff.module.css";
import { brands } from "./brands";
import DealCard from "./DealCard";

export default function DealMosaic() {
  return (
    <div className={styles.proof} aria-label="Example brands worth a look">
      {brands.map((brand) => (
        <DealCard key={brand.id} brand={brand} />
      ))}
    </div>
  );
}
