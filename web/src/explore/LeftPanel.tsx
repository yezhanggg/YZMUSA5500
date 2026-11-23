// The left panel: the Explore controls (Boundaries, Data Layers). Same shell as the right panel.
// Wide screens: in the left column. Tablet and phone: a drawer from the left (`drawer`), closed with the button or Esc.
import { motion } from 'motion/react';
import { PanelLeftClose, X } from 'lucide-react';
import { SPRING_PANEL } from '../components/primitives';
import { PANEL, PANEL_BODY, PanelHeader, IconButton } from '../components/Panel';
import { cx } from '../lib/cx';
import { useTool } from './store';
import ExploreControls from './ExploreControls';

export default function LeftPanel({ style, drawer, onClose, column }: { style?: React.CSSProperties; drawer?: boolean; onClose?: () => void; column?: boolean }) {
  const status = useTool((s) => s.status);
  const areas = useTool((s) => s.areas);
  return (
    <motion.aside
      initial={drawer ? { x: '-105%' } : { opacity: 0, x: -16, filter: 'blur(6px)' }}
      animate={drawer ? { x: 0 } : { opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={drawer ? { x: '-105%', transition: { duration: 0.2 } } : undefined}
      transition={{ ...SPRING_PANEL, delay: drawer ? 0 : 0.1 }}
      // column: desktop and laptop, inside the left column. There it is as tall as what is open, up to the column's
      // height, and scrolls inside past that.
      className={cx(PANEL, column ? 'relative min-h-0 shrink' : 'absolute z-30')}
      style={style}
      aria-label="Map controls"
    >
      <PanelHeader title="Explore" actions={onClose ? drawer ? <IconButton label="Close controls" onClick={onClose}><X className="h-4 w-4" /></IconButton> : <IconButton label="Hide the controls" onClick={onClose}><PanelLeftClose className="h-4 w-4" /></IconButton> : undefined}>
        {status === 'error' || areas === 'error' ? <p className="text-small text-rose-700">The map data did not load. Refresh the page to try again.</p> : null}
      </PanelHeader>
      {/* A little room at the top so the first card's border is not clipped by the scroll area. */}
      <div className={cx(PANEL_BODY, 'pt-1')}>
        <ExploreControls />
      </div>
    </motion.aside>
  );
}
