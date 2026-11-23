// The Details panel. For a picked area: the layer on the map for this area (value, how it compares, a takeaway, in
// LayerHere), then the answer for the tract and town, four rows, and closed folds (AreaResults). On tablet and phone
// the same pieces fill the bottom sheet. On desktop and laptop the left edge drags to resize (ResizeHandle).
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { PanelRightClose } from 'lucide-react';
import { PANEL, PANEL_BODY, PanelHeader, IconButton } from '../components/Panel';
import { SPRING_PANEL } from '../components/primitives';
import { cx } from '../lib/cx';
import CountyTable from './CountyTable';
import { ReportSkeleton, reportTitle } from './Report';
import { AreaAnswer, AreaFolds, AreaRows } from './AreaResults';
import { HeadSub, PlaceAnswer, PlaceRows } from './PlaceResults';
import { placesShown } from './places';
import ResizeHandle from './ResizeHandle';
import LayerHere from './LayerHere';
import { useTool, type Spot } from './store';
import type { MapLevel } from './metrics';
import { Fold, Folds, ShortNotice } from './ui/Answer';

/** The header title for a spot: the area the layer is about. The town on Where to Build and on ADUs by 2031 by town,
 * the county by county, else the tract. */
export function headOf(spot: Spot | null, legal: boolean, level: MapLevel = 'tract') {
  if (!spot) return null;
  const town = spot.town.NAMELSAD as string | undefined;
  const county = spot.tract.county ? `${spot.tract.county} County` : undefined;
  if ((legal || level === 'town') && town) return { label: town, sub: county };
  if (level === 'county' && county) return { label: county, sub: reportTitle(spot).sub.split(' · ').slice(0, 2).join(' · ') };
  return reportTitle(spot);
}

/** This layer here, the answer, four rows, then closed folds. Shared by the right panel and the sheet. */
export function ReportStack() {
  const spot = useTool((s) => s.spot);
  const level = useTool((s) => s.level);
  const busy = useTool((s) => s.busy);
  const msg = useTool((s) => s.msg);
  const legal = useTool((s) => placesShown(s));
  if (busy && !spot) return <ReportSkeleton />;
  const counties = level === 'county';
  // Where to Build: the municipality's answer first, four short rows, then the payoff and room rows folded.
  if (legal && spot)
    return (
      <div className="space-y-3">
        <LayerHere spot={spot} />
        <PlaceAnswer spot={spot} />
        <PlaceRows spot={spot} />
        <ShortNotice />
        <Folds>
          <Fold title="Payoff and room">
            <AreaRows spot={spot} skipRule />
          </Fold>
        </Folds>
        <AreaFolds spot={spot} />
      </div>
    );
  return (
    <div className="space-y-3">
      {msg && !spot && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-small text-rose-800 ring-1 ring-rose-200">{msg}</p>}
      {!spot && !counties && <p className="px-1 text-small text-slate-600">Click a tract, town or county on the map to see this layer there, how it compares with Pennsylvania, and a short takeaway.</p>}
      {counties && !spot && <CountyTable />}
      {spot && <LayerHere spot={spot} />}
      {spot && <AreaAnswer spot={spot} />}
      {spot && <AreaRows spot={spot} />}
      {spot && <ShortNotice />}
      <AreaFolds spot={spot} counties={counties && !!spot} />
    </div>
  );
}

/** Wide screens: a column. Laptop: a wide drawer over the map (`drawer`), closed with the button. Both resize from the left edge. */
export default function RightPanel({ style, drawer, onClose, below }: { style: React.CSSProperties; drawer?: boolean; onClose?: () => void; below?: React.ReactNode }) {
  const spot = useTool((s) => s.spot);
  const busy = useTool((s) => s.busy);
  const legal = useTool((s) => placesShown(s));
  const level = useTool((s) => s.level);
  const head = headOf(spot, legal, level);
  // The same elements while the width changes, so a drag only re-lays out the panel and re-renders nothing inside.
  const header = useMemo(
    () => (
      <PanelHeader title={head?.label ?? 'Details'} sub={spot && legal ? <HeadSub spot={spot} text={head?.sub} /> : head?.sub} actions={onClose && <IconButton label="Hide the details" onClick={onClose}><PanelRightClose className="h-4 w-4" /></IconButton>}>
        {busy && <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-violet-100"><motion.div className="h-full w-1/3 rounded-full bg-violet-500" animate={{ x: ['-100%', '300%'] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }} /></div>}
      </PanelHeader>
    ),
    [head?.label, head?.sub, legal, spot, onClose, busy],
  );
  const body = useMemo(() => <div className={PANEL_BODY}><ReportStack /></div>, []);
  // One column, one width (the handle resizes all of it): the results box, and under it the map controls row
  // (`below`, with the legend on top). The results box ends where that row starts.
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(0);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => setRowH(rowRef.current?.offsetHeight ?? 0));
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, []);
  const GAP = 12;
  const bottom = rowH + (rowH ? GAP : 0);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        // Slides in from the right edge and out to it (hide and show, laptop drawer).
        initial={{ x: '108%' }}
        animate={{ x: 0 }}
        exit={{ x: '108%' }}
        transition={SPRING_PANEL}
        className={cx(drawer ? 'absolute z-40' : 'absolute z-20')}
        style={style}
      >
        <ResizeHandle />
        <aside className={cx(PANEL, '@container absolute inset-x-0 top-0')} style={{ bottom }} aria-label="Details">
          {header}
          {body}
        </aside>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 [&>*]:pointer-events-auto">
          {below && (
            <div ref={rowRef} className="flex justify-end">
              {below}
            </div>
          )}
        </div>
      </motion.div>
    </MotionConfig>
  );
}
