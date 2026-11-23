// The site: Home, Proposal, Map, and Notebooks & Code (plus the report, linked from Home). One page
// at a time, picked by the hash (site/route.ts). The map (MapLibre) loads in its own chunk.
import { Suspense, lazy, useEffect } from 'react';
import { useRoute, type Page } from './site/route';
import { MapNav, SiteHeader } from './site/Nav';
import Home from './site/Home';
import DocPage from './site/DocPage';
import Notebooks, { NotebookView } from './site/Notebooks';
import Footer from './site/Footer';
import { NOTEBOOKS } from './site/config';

const ExplorePage = lazy(() => import('./explore/ExplorePage'));

const TITLE: Record<Page, string> = {
  home: 'Housing Demand and ADUs in Pennsylvania',
  proposal: 'Proposal',
  map: 'Map',
  notebooks: 'Notebooks & Code',
  report: 'Report',
};

export default function App() {
  const { page, sub } = useRoute();
  const notebook = page === 'notebooks' && sub ? NOTEBOOKS.find((n) => n.id === sub) : undefined;

  useEffect(() => {
    const name = notebook ? `Notebook ${notebook.n}: ${notebook.title}` : TITLE[page];
    document.title = `${name} · MUSA 5500`;
  }, [page, notebook]);
  // A new page starts at its top. (Newer browsers return a promise from scrollTo: keep it out of the effect's return.)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page, sub]);

  if (page === 'map')
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-[#eef0f2]">
        <Suspense
          fallback={
            <div className="grid h-full place-items-center">
              <span className="shimmer-text text-body font-medium">Loading the map…</span>
            </div>
          }
        >
          <ExplorePage nav={(place) => <MapNav place={place} />} />
        </Suspense>
      </div>
    );

  // A notebook fills the window under the bar, with no footer.
  if (notebook)
    return (
      <div className="flex h-dvh flex-col">
        <SiteHeader />
        <NotebookView nb={notebook} />
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {page === 'home' && <Home />}
        {(page === 'proposal' || page === 'report') && <DocPage page={page} />}
        {page === 'notebooks' && <Notebooks />}
      </main>
      <Footer />
    </div>
  );
}
