const ALLOWED = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "a"]);

/** Read-only preview HTML. Drops scripts, handlers, and anything that is not a simple https link. */
export function sanitizePreviewHtml(value: string): string {
  const withoutBlocks = value.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  return withoutBlocks.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, name: string, attrs: string) => {
    const tagName = name.toLowerCase();
    if (!ALLOWED.has(tagName)) return "";
    if (tag.startsWith("</")) return `</${tagName}>`;
    if (tagName === "br") return "<br>";
    if (tagName !== "a") return `<${tagName}>`;
    const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const raw = href?.[1] || href?.[2] || href?.[3] || "";
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return "<a>";
    }
    if (url.protocol !== "https:") return "<a>";
    return `<a href="${escapeAttr(url.toString())}" rel="noopener noreferrer">`;
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
