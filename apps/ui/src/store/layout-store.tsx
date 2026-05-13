import { atom, getDefaultStore } from "jotai";

/** When true, the project layout shows the right auxiliary pane (~30% width). */
export const rightPaneOpenAtom = atom(true);

/** Toggle right pane visibility (uses app root default Jotai store). */
export function toggleRightPaneVisibility() {
  getDefaultStore().set(rightPaneOpenAtom, (open) => !open);
}

/** Open the project right pane (e.g. from canvas upper-right control). */
export function openRightPane() {
  getDefaultStore().set(rightPaneOpenAtom, true);
}
