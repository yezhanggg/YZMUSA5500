// The answer words shared by the Details cards: yes, yes with an approval step, no, or not sure.
export type Answer = 'yes' | 'approval' | 'no' | 'unknown';

/** One row of a checklist: passes, fails, needs an approval step, or not checked. */
export type RowState = 'pass' | 'fail' | 'approval' | 'unknown';
