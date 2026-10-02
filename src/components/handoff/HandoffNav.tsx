import Image from "next/image";
import Link from "next/link";
import styles from "@/app/handoff/handoff.module.css";

const links = [
  { href: "/#focus", label: "THESIS" },
  { href: "/#why", label: "WHY" },
  { href: "/#philosophy", label: "PHILOSOPHY" },
  { href: "/#contact", label: "CONTACT" },
];

export default function HandoffNav() {
  return (
    <nav className={styles.nav} id="handoff-nav" aria-label="Primary">
      <div className={styles.navInner}>
        <Link href="/" aria-label="Backfield Ventures Home">
          <Image
            src="/logo-text.png"
            alt="Backfield Ventures"
            width={1462}
            height={317}
            className={styles.navLogo}
            loading="eager"
          />
        </Link>
        <ul className={styles.navLinks}>
          {links.map((link) => (
            <li key={link.href}>
              <Link className={styles.navLink} href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
