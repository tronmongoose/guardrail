// LLMs occasionally wrap generated titles in matching straight/curly quotes.
// Strip them at write time and defensively at render time.
export function stripWrappingQuotes(s: string): string {
  if (!s) return s;
  return s.replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "");
}
