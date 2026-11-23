// The site menu. Pages: a bar across the top (a Menu button on narrow screens). The map: a small pill that floats over
// the map between the panels, with the same pages in a menu.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cx } from '../lib/cx';
import { SPRING_TAB } from '../components/primitives';
import { href, useRoute, type Page } from './route';

export const NAV: { page: Page; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'proposal', label: 'Proposal' },
  { page: 'map', label: 'Map' },
  { page: 'notebooks', label: 'Notebooks & Code' },
];

/** The house mark with the course number. */
function Brand({ small }: { small?: boolean }) {
  return (
    <a href={href('home')} className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-violet-500" aria-label="MUSA 5500 home">
      <svg viewBox="0 0 32 32" className={small ? 'h-7 w-7 shrink-0' : 'h-8 w-8 shrink-0'} aria-hidden>
        <rect width="32" height="32" rx="8" fill="#7c3aed" />
        <path d="M7 16l6-5 6 5v8H7z" fill="white" />
        <rect x="20" y="18" width="6" height="6" rx="1" fill="#c4b5fd" />
      </svg>
      <span className="min-w-0 leading-tight">
        <span className="block font-display text-body font-bold text-slate-900">MUSA 5500</span>
        {!small && <span className="block truncate text-caption text-slate-500">Housing demand and ADUs in Pennsylvania</span>}
      </span>
    </a>
  );
}

/** Closes on Escape and on a press outside `ref`. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    window.addEventListener('keydown', esc);
    window.addEventListener('pointerdown', out);
    return () => {
      window.removeEventListener('keydown', esc);
      window.removeEventListener('pointerdown', out);
    };
  }, [open, close]);
  return ref;
}

/** The page list as a dropdown. */
function MenuList({ current, onPick }: { current: Page; onPick: () => void }) {
  return (
    <motion.div role="menu" aria-label="Pages" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }} transition={SPRING_TAB} style={{ transformOrigin: 'top right' }} className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/5">
      {NAV.map((n) => (
        <a key={n.page} role="menuitem" href={href(n.page)} onClick={onPick} aria-current={n.page === current ? 'page' : undefined} className={cx('tap block rounded-lg px-3 py-2 text-small font-semibold transition-colors', n.page === current ? 'bg-violet-50 text-violet-800' : 'text-slate-800 hover:bg-stone-100')}>
          {n.label}
        </a>
      ))}
    </motion.div>
  );
}

/** The bar across the top of every page but the map. */
export function SiteHeader() {
  const { page } = useRoute();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => setOpen(false), [page]);
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#fbfaf8]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Pages" className="hidden items-center gap-0.5 md:flex">
          {NAV.map((n) => {
            const on = n.page === page;
            return (
              <a key={n.page} href={href(n.page)} aria-current={on ? 'page' : undefined} className={cx('relative rounded-lg px-3 py-1.5 text-small font-semibold transition-colors', on ? 'text-violet-800' : 'text-slate-600 hover:text-slate-900')}>
                {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-violet-50 ring-1 ring-violet-200/70" transition={SPRING_TAB} />}
                <span className="relative">{n.label}</span>
              </a>
            );
          })}
        </nav>
        <div ref={ref} className="relative md:hidden">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" className="tap flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-small font-semibold text-slate-700 ring-1 ring-stone-200 hover:text-slate-900">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menu
          </button>
          <AnimatePresence>{open && <MenuList current={page} onPick={() => setOpen(false)} />}</AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/** The map page: a small pill over the map (`place` sets where), the course name and a Pages menu. */
export function MapNav({ place }: { place: CSSProperties }) {
  const { page } = useRoute();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="pointer-events-none absolute z-50 flex justify-center" style={place}>
      <nav aria-label="Site" className="pointer-events-auto relative flex min-w-0 items-center gap-1 rounded-xl bg-white/90 py-1 pl-2 pr-1 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur">
        <Brand small />
        <div ref={ref} className="relative">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" className="tap relative flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-small font-semibold text-slate-600 transition-colors hover:bg-stone-100 hover:text-slate-900">
            Pages
            <ChevronDown className={cx('h-3.5 w-3.5 text-slate-500 transition-transform', open && 'rotate-180')} />
          </button>
          <AnimatePresence>{open && <MenuList current={page} onPick={() => setOpen(false)} />}</AnimatePresence>
        </div>
      </nav>
    </div>
  );
}
