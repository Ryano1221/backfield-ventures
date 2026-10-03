"use client";

import { FormEvent, useState } from "react";
import styles from "@/app/handoff/handoff.module.css";

type Status = "idle" | "submitting" | "done" | "error";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HandoffSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/handoff-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscribe", email: value }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className={`${styles.section} ${styles.sectionSubscribe}`}
      id="subscribe"
      aria-labelledby="dr-sub-h"
    >
      <div className={styles.container}>
        <div className={styles.subscribeWrap}>
          <div className={`${styles.card} ${styles.cardInevitable}`}>
            <span className={styles.cardKicker}>SUBSCRIBE</span>
            <h2 id="dr-sub-h" className={styles.cardTitle}>
              Get The Handoff
            </h2>
            <p className={styles.cardBody}>
              One email a month about early sports and consumer brands worth a look. Your email is enough.
            </p>
            {status === "done" ? (
              <p className={styles.thanks} role="status">
                Thanks. We have your email for the next monthly Handoff.
              </p>
            ) : (
              <form className={styles.form} onSubmit={onSubmit} noValidate>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Email *</span>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      aria-invalid={status === "error"}
                      aria-describedby={status === "error" ? "handoff-email-error" : undefined}
                    />
                  </label>
                </div>
                {status === "error" ? (
                  <p id="handoff-email-error" className={styles.formError} role="alert">
                    Enter a valid email and try again.
                  </p>
                ) : null}
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnFilled}`}
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    "Sending"
                  ) : (
                    <>
                      Send me The Handoff <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
