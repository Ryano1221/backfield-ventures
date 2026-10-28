export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(url.href, context);
  }
  // Node ESM does not resolve Next's extensionless server entry. The Next
  // bundler does. Rewrite it so route tests can import the handler.
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  return nextResolve(specifier, context);
}
