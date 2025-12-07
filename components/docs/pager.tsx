// Docs pager disabled - placeholder component

export interface DocPage {
  slug: string;
}

export function DocsPager({ doc }: { doc: DocPage }) {
  return null;
}

export function getPagerForDoc(doc: DocPage) {
  return { prev: null, next: null };
}

export function flatten(links: unknown[]) {
  return [];
}
