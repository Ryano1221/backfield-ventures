import styles from "@/app/handoff/handoff.module.css";

export default function HandoffHero() {
  return (
    <>
      <div className={styles.sectionLabel}>
        <span className={styles.sectionNum}>05 · THE HANDOFF</span>
      </div>
      <h1 id="dr-headline" className={styles.sectionHeading}>
        Early sports and consumer brands
      </h1>
      <p className={styles.lead}>
        Private sports and consumer brands. Click a card. Subscribe for the monthly issue.
      </p>
    </>
  );
}
