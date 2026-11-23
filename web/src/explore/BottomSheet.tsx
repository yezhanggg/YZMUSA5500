// Tablet and phone: one bottom sheet with the Details of the picked area. It peeks (the name and the answer line)
// and opens on tap, or when a spot is picked.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cx } from '../lib/cx';
import { SPRING_PANEL } from '../components/primitives';
import { PANEL_BODY } from '../components/Panel';
import { ReportStack, headOf } from './RightPanel';
import { AreaLine } from './AreaResults';
import { HeadSub, PlaceLine } from './PlaceResults';
import { placesShown } from './places';
import { useTool } from './store';
import { GUTTER, SHEET_PEEK, sheetOpenHeight } from './layout';

export default function BottomSheet({ maxWidth }: { maxWidth?: number }) {
  const spot = useTool((s) => s.spot);
  const open = useTool((s) => s.sheetOpen);
  const set = useTool((s) => s.set);
  const setOpen = (o: boolean) => set({ sheetOpen: o });
  useEffect(() => {
    if (spot) setOpen(true);
  }, [spot?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Where to Build answers for the municipality: its name heads the sheet (as in the right panel).
  const legal = useTool((s) => placesShown(s));
  const level = useTool((s) => s.level);
  const head = headOf(spot, legal, level);
  return (
    <motion.section
      aria-label="Details sheet"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1, height: open ? sheetOpenHeight(vh) : SHEET_PEEK }}
      transition={SPRING_PANEL}
      className="absolute bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl bg-white/95 shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur"
      style={{ left: maxWidth ? `max(${GUTTER}px, calc(50% - ${maxWidth / 2}px))` : 0, right: maxWidth ? `max(${GUTTER}px, calc(50% - ${maxWidth / 2}px))` : 0 }}
    >
      <button type="button" onClick={() => setOpen(!open)} className="tap flex w-full shrink-0 justify-center pt-2" aria-label={open ? 'Shrink the sheet' : 'Open the sheet'} aria-expanded={open}>
        <span className="h-1.5 w-10 rounded-full bg-stone-300" />
      </button>
      <div className="shrink-0 px-4">
        {spot ? (
          <div className="mt-1 min-w-0">
            <div className="truncate font-display text-body font-bold text-slate-900">{head?.label}</div>
            <div className="truncate text-caption text-slate-600">{legal ? <HeadSub spot={spot} text={head?.sub} /> : head?.sub}</div>
          </div>
        ) : (
          <div className="mt-1 font-display text-body font-bold text-slate-900">Details</div>
        )}
        {!open && spot && <div className="mt-2">{legal ? <PlaceLine spot={spot} /> : <AreaLine spot={spot} />}</div>}
      </div>
      <div className={cx(PANEL_BODY, 'pt-3')}>
        <ReportStack />
      </div>
    </motion.section>
  );
}
