/**
 * GitHub-compatible heading anchors.
 *
 * Mirrors the algorithm GitHub uses (and the `github-slugger` package):
 * lowercase the text, drop punctuation and symbols, turn spaces into hyphens,
 * and give repeated headings `-1`, `-2`, ... suffixes.
 */

// Keep letters, combining marks, numbers, connector punctuation (`_`), spaces and hyphens.
const REMOVED = /[^\p{L}\p{M}\p{N}\p{Pc} -]/gu;

export function slugify(text: string): string {
  return text.toLowerCase().replace(REMOVED, "").replace(/ /g, "-");
}

/** Produces unique slugs for the headings of one document, in order. */
export class Slugger {
  readonly #occurrences = new Map<string, number>();

  slug(text: string): string {
    const base = slugify(text);
    let slug = base;
    while (this.#occurrences.has(slug)) {
      const count = (this.#occurrences.get(base) ?? 0) + 1;
      this.#occurrences.set(base, count);
      slug = `${base}-${count}`;
    }
    this.#occurrences.set(slug, 0);
    return slug;
  }
}
