import styles from "@/app/handoff/handoff.module.css";

export default function HandoffMidCta() {
  return (
    <div className={styles.midCta}>
      <a className={`${styles.btn} ${styles.btnFilled}`} href="#subscribe">
        Get the next Handoff <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
