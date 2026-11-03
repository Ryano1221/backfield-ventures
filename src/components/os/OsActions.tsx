"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OsActions({ loginPath }: { loginPath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/os/logout", { method: "POST" });
    router.replace(loginPath);
    router.refresh();
  }

  return (
    <div className="os-actions">
      <button type="button" onClick={() => router.refresh()}>
        Refresh
      </button>
      <button type="button" onClick={signOut} disabled={busy}>
        {busy ? "Signing out" : "Sign out"}
      </button>
    </div>
  );
}
