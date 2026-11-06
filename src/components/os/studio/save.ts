import type { Studio } from "@/lib/os/studio";

/** Post one studio change. Returns the saved studio, or an error Ryan can read. */
export async function saveStudio(op: Record<string, unknown>): Promise<{ studio?: Studio; id?: string; error?: string }> {
  try {
    const res = await fetch("/api/os/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op),
    });
    const data = (await res.json().catch(() => ({}))) as { studio?: Studio; id?: string; error?: string };
    if (!res.ok) return { error: data.error || "Could not save that." };
    return data;
  } catch {
    return { error: "No connection. Nothing was saved." };
  }
}
