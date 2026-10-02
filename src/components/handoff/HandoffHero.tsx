import styles from "@/app/handoff/handoff.module.css";

export default function HandoffHero() {
  return (
    <>
      <div className={styles.sectionLabel}>
        <span className={styles.sectionNum}>05 · THE HANDOFF</span>
      </div>
      <h1 id="dr-headline" className={styles.sectionHeading}>
        Early sports and consumer brands worth a look
      </h1>
      <p className={styles.lead}>
        Private sports and consumer brands worth a look. Click a card. Subscribe for the monthly issue.
      </p>
      <a className={styles.btn} href="#subscribe">
        Get the next Handoff <span aria-hidden="true">→</span>
      </a>
    </>
  );
}
