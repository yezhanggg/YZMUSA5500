// Pages live in the hash (#/results, #/notebooks/01_trends), so a static host only needs index.html.
import { useSyncExternalStore } from 'react';

/** The four pages in the menu, and the report (linked from Home, printed to the PDF). */
export type Page = 'home' | 'proposal' | 'map' | 'notebooks' | 'report';
export interface Route {
  page: Page;
  /** The notebook open on #/notebooks/<id>. */
  sub: string | null;
}

const PAGES: Page[] = ['home', 'proposal', 'map', 'notebooks', 'report'];
/** Pages of the older, longer site, sent to where their content is now. */
const MOVED: Record<string, Page> = { recreate: 'notebooks', code: 'notebooks', data: 'report', methods: 'report', results: 'report' };

export function routeOf(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [a, b] = path.split('/').filter(Boolean);
  const page = (PAGES as string[]).includes(a ?? '') ? (a as Page) : (MOVED[a ?? ''] ?? 'home');
  return { page, sub: b ?? null };
}

/** The link to a page: "#/", "#/methods", "#/notebooks/01_trends". */
export const href = (page: Page, sub?: string) => (page === 'home' ? '#/' : `#/${page}${sub ? `/${sub}` : ''}`);

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  return routeOf(useSyncExternalStore(subscribe, () => window.location.hash, () => ''));
}
