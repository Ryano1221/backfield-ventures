export function monogram(name: string): string {
  const parts = name
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "fixture");
  const letters = (parts.length ? parts : [name]).slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "BV";
}

/** A logo counts only after it has loaded and has pixels. A failed or empty image stays on the initials tile. */
export function logoReady(image: { complete: boolean; naturalWidth: number } | null): boolean {
  if (!image?.complete) return false;
  return image.naturalWidth > 0;
}
