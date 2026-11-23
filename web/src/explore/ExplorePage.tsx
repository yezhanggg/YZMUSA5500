// The Explore map: a full-screen map with panels on one grid (layout.ts).
//   desktop and laptop: the controls on the left, Details on the right, same top, bottom, gutters and shell
//   tablet and phone: the controls in a drawer from the left, Details in one bottom sheet
// `nav` is the site menu: it floats over the map between the panels.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftOpen, PanelRightOpen, SlidersHorizontal } from 'lucide-react';
import MapCanvas from './MapCanvas';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import BottomSheet from './BottomSheet';
import MapControls from './MapControls';
import { aduFromHash, mapRef, useTool } from './store';
import { clearSpot, reduced } from './actions';
import { GUTTER, PANEL_TOP, mapPadding, SHEET_MAX, SHEET_PEEK, TOP, narrow, rightDrawer, sheetOpenHeight, statePadding, useLegendSlot, useMode, useRightWidth, useSides, widths } from './layout';
import { SPRING_PANEL } from '../components/primitives';
import { PA_BBOX } from './geo';

const SHOW_BTN = 'tap absolute z-40 flex h-11 items-center gap-2 rounded-xl bg-white/95 px-3 text-small font-semibold text-slate-700 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500';

export default function ExplorePage({ nav }: { nav?: (place: CSSProperties) => ReactNode }) {
  const status = useTool((s) => s.status);
  const mode = useMode();
  const isNarrow = narrow(mode);
  const isDrawer = rightDrawer(mode);
  const resultsOpen = useTool((s) => s.resultsOpen);
  // Desktop and laptop: each side can be hidden. Laptop's right side is the results drawer (resultsOpen).
  const leftOpen = useSides((s) => s.left);
  const rightSide = useSides((s) => s.right);
  const rightOpen = isDrawer ? resultsOpen : rightSide;
  const setRight = (o: boolean) => (isDrawer ? useTool.getState().set({ resultsOpen: o }) : useSides.getState().setSide('right', o));
  const lw = isNarrow || leftOpen ? widths(mode).lw : 0;
  const [drawer, setDrawer] = useState(false);
  const sheetOpen = useTool((s) => s.sheetOpen);
  const [vh, setVh] = useState(() => window.innerHeight);
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => (setVh(window.innerHeight), setVw(window.innerWidth));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // Desktop and laptop: the right panel's width follows its drag handle (layout.ts). Laptop: the results drawer
  // takes that much of the map when open, nothing when closed.
  const panelW = useRightWidth(vw);
  const rw = isNarrow ? widths(mode).rw : rightOpen ? panelW : 0;
  // On tablet and phone, the map buttons and credits ride just above the sheet, open or peeking.
  const sheetH = sheetOpen ? sheetOpenHeight(vh) : SHEET_PEEK;
  // Room left for the map buttons between the top bar and the sheet: full set, 2D/3D only, or none.
  const room = isNarrow ? vh - sheetH - TOP - GUTTER * 2 : Infinity;
  const controlsSize: 'full' | 'compact' | 'switch' | 'none' = room >= 160 ? (mode === 'phone' ? 'compact' : 'full') : room >= 104 ? 'compact' : room >= 52 ? 'switch' : 'none';

  // An ADU link opened while the map is up (#/map?bed=2&size=800&st=1).
  useEffect(() => {
    const on = () => {
      if (/[?&](bed|size|st)=/.test(window.location.hash)) useTool.getState().set({ adu: aduFromHash(window.location.hash) });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // Esc lets go of the picked area (not while typing).
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !useTool.getState().spot) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      clearSpot();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  // The drawer closes on Esc, and when a spot is picked.
  useEffect(() => {
    if (!drawer) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [drawer]);
  const spotN = useTool((s) => s.spot?.n);
  useEffect(() => setDrawer(false), [spotN]);
  // A picked area opens the results drawer (laptop) or the right column (desktop), which start hidden. They open as
  // soon as a pick starts loading, so the loading message shows there.
  const busy = useTool((s) => s.busy);
  useEffect(() => {
    if (!spotN && !busy) return;
    useTool.getState().set({ resultsOpen: true });
    useSides.getState().setSide('right', true);
  }, [spotN, busy]);
  // Hiding or showing a side leaves the map picture where it is (the panels float over it). The map's padding still
  // follows the open space: the centre is moved by exactly what the new padding would shift, so nothing on screen moves.
  const firstSides = useRef(true);
  useEffect(() => {
    if (firstSides.current) return void (firstSides.current = false);
    const map = mapRef.current;
    if (!map) return;
    const go = () => {
      const p = mapPadding(rightOpen);
      const cv = map.getCanvas();
      const x = p.left + (cv.clientWidth - p.left - p.right) / 2;
      const y = p.top + (cv.clientHeight - p.top - p.bottom) / 2;
      map.jumpTo({ center: map.unproject([x, y]), padding: p });
    };
    if (map.isMoving()) map.once('moveend', go);
    else go();
  }, [leftOpen, rightOpen]);
  useEffect(() => {
    if (!isNarrow) setDrawer(false);
  }, [isNarrow]);
  // With nothing picked, Pennsylvania fills the open map between the panels: on the first load, and again when a side
  // is hidden or shown, the right panel resized or the window changed, as long as the user has not moved the map since.
  const spotOn = useTool((s) => !!s.spot);
  const atState = useRef(true);
  const first = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    const off = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) atState.current = false;
    };
    map.on('movestart', off);
    return () => void map.off('movestart', off);
  }, [status]);
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    if (spotOn) return void (atState.current = false);
    const entering = first.current;
    first.current = false;
    if (!entering && !atState.current) return;
    atState.current = true; // a burst of changes right after the first load still fits
    const fit = () => {
      map.fitBounds(PA_BBOX, { padding: statePadding(isNarrow ? sheetOpen : rightOpen), absolutePadding: true, duration: entering || reduced() ? 0 : 400 });
      atState.current = true;
    };
    // After layout (the legend's place), and once per burst while the right panel is dragged.
    const t = window.setTimeout(fit, entering ? 0 : 120);
    return () => window.clearTimeout(t);
  }, [status, spotOn, leftOpen, rightOpen, panelW, vw, vh, isNarrow, sheetOpen]);

  const leftStyle: CSSProperties = isNarrow ? { left: GUTTER, top: TOP, bottom: GUTTER, width: `min(${lw || 360}px, calc(100% - ${GUTTER * 2}px))` } : { left: GUTTER, top: PANEL_TOP, bottom: GUTTER, width: widths(mode).lw };
  const rightStyle: CSSProperties = { right: GUTTER, top: PANEL_TOP, bottom: GUTTER, width: panelW };
  // The control row drops the Aerial label when the open map is narrow (laptop with the results drawer open).
  const openMap = vw - lw - rw - GUTTER * 4;
  const setLegendSlot = useLegendSlot((s) => s.setEl);
  // Map controls: bottom right of the open map area.
  const controls: CSSProperties = isNarrow ? { right: GUTTER, bottom: sheetH + GUTTER, transition: 'bottom .35s cubic-bezier(.22,1,.36,1)' } : { right: rightOpen ? rw + GUTTER * 2 : GUTTER, bottom: GUTTER };
  // The "© OpenStreetMap" line: the bottom right corner of the open map (left of the right panel, above the sheet).
  const shellVars = { ['--attr-left' as string]: `${isNarrow ? GUTTER : lw + GUTTER * 2}px`, ['--attr-bottom' as string]: `${isNarrow ? sheetH + GUTTER : GUTTER}px`, ['--credit-right' as string]: `${!isNarrow && rightOpen ? rw + GUTTER * 2 : 0}px`, ['--credit-bottom' as string]: `${isNarrow ? sheetH : 0}px` } as CSSProperties;

  // Desktop and laptop: the legend of the layer on the map sits right on top of the map buttons and takes their row's
  // width. With Details open the buttons sit under the panel, so the legend stacks there too and the panel ends above
  // it. The slot moves between the two places as Details opens and closes. The old one unmounts after the panel's
  // slide, so it may only clear the target when the target is that old, detached element.
  const legendRef = useCallback((el: HTMLDivElement | null) => {
    const cur = useLegendSlot.getState().el;
    if (el) setLegendSlot(el);
    else if (cur && !cur.isConnected) setLegendSlot(null);
  }, [setLegendSlot]);
  const legendSlot = isNarrow ? null : <div ref={legendRef} className="w-0 min-w-full space-y-2 empty:hidden" data-legend-slot />;

  // The site menu: centred over the open map between the panels. Tablet and phone: right of the controls button.
  const navPlace: CSSProperties = isNarrow ? { top: GUTTER, left: GUTTER * 2 + 44, right: GUTTER } : { top: GUTTER, left: leftOpen ? lw + GUTTER * 2 : 120 + GUTTER * 2, right: (rightOpen ? rw : 120) + GUTTER * 2 };

  return (
    <div className="bh-shell absolute inset-0" style={shellVars}>
      <MapCanvas />
      {isNarrow ? (
        <>
          <button type="button" onClick={() => setDrawer(true)} aria-label="Map controls" aria-expanded={drawer} className="tap absolute z-40 grid h-11 w-11 place-items-center rounded-xl bg-white/95 text-slate-700 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur hover:text-slate-900" style={{ left: GUTTER, top: GUTTER }}>
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {drawer && (
              <>
                <motion.div key="drawer-backdrop" className="absolute inset-0 z-30 bg-slate-900/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} aria-hidden />
                <LeftPanel key="drawer" style={leftStyle} drawer onClose={() => setDrawer(false)} />
              </>
            )}
          </AnimatePresence>
          <BottomSheet maxWidth={mode === 'tablet' ? SHEET_MAX : undefined} />
        </>
      ) : (
        <>
          {/* The left column. It slides out to the left when hidden. A "Controls" button at the left edge brings it back. */}
          <AnimatePresence initial={false}>
            {leftOpen ? (
              // The column spans the height, but only the panel takes clicks: the map below a short panel stays clickable.
              <motion.div key="left" className="pointer-events-none absolute z-30 flex flex-col gap-3 [&>*]:pointer-events-auto" style={leftStyle} initial={{ x: '-110%' }} animate={{ x: 0 }} exit={{ x: '-110%' }} transition={reduced() ? { duration: 0 } : SPRING_PANEL}>
                <LeftPanel column onClose={() => useSides.getState().setSide('left', false)} />
              </motion.div>
            ) : (
              <motion.button key="show-left" type="button" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} onClick={() => useSides.getState().setSide('left', true)} aria-label="Show the controls" title="Show the controls" className={SHOW_BTN} style={{ left: GUTTER, top: GUTTER }}>
                <PanelLeftOpen className="h-5 w-5" /> Controls
              </motion.button>
            )}
          </AnimatePresence>
          {/* The right column (Details, then the map controls row). Hidden, it slides out to the right. A "Details"
              button at the right edge brings it back. */}
          <AnimatePresence initial={false}>
            {rightOpen ? (
              <RightPanel key="results" style={rightStyle} drawer={isDrawer} onClose={() => setRight(false)} below={<ControlsStack legend={legendSlot}><MapControls row /></ControlsStack>} />
            ) : (
              <motion.button key="open-results" type="button" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} onClick={() => setRight(true)} aria-label="Show the details" title="Show the details" className={SHOW_BTN} style={{ right: GUTTER, top: GUTTER }}>
                <PanelRightOpen className="h-5 w-5" /> Details
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
      {/* Desktop and laptop: the controls row sits under the right panel (RightPanel `below`). It floats on the map
          only on tablet and phone, and while Details is closed. */}
      {controlsSize !== 'none' &&
        (isNarrow || !rightOpen) &&
        (isNarrow ? (
          <MapControls style={controls} size={controlsSize} row={false} />
        ) : (
          <div className="pointer-events-none absolute z-20 [&>*]:pointer-events-auto" style={controls}>
            <ControlsStack legend={legendSlot}>
              <MapControls size={controlsSize} row tight={openMap < 420} />
            </ControlsStack>
          </div>
        ))}
      {nav?.(navPlace)}
    </div>
  );
}

/** The legend card on top of the map buttons row, as wide as the row (the row sets the width). */
function ControlsStack({ legend, children }: { legend: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-max flex-col items-stretch gap-2">
      {legend}
      {children}
    </div>
  );
}
