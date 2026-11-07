"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BootIntro } from "@/components/os/BootIntro";

export function LoginForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/os/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // The intro covers the jump to Today; it goes away when this page does.
      setEntering(true);
      router.replace(destination);
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.status === 429) setError("Too many attempts. Wait and try again.");
    else if (res.status === 503) setError("Sign-in is not configured.");
    else setError("Incorrect password.");
  }

  return (
    <form onSubmit={onSubmit}>
      {entering ? <BootIntro label="Opening the OS" /> : null}
      <label htmlFor="os-password">Password</label>
      <input
        id="os-password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError("");
        }}
      />
      <button type="submit" disabled={busy || password.length === 0}>
        {busy ? "Checking" : "Enter"}
      </button>
      {error ? (
        <p className="os-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
