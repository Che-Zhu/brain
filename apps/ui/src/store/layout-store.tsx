import { atom, getDefaultStore } from "jotai";

/** When true, the project layout shows the persistent Project Assistant Pane. */
export const assistantPaneOpenAtom = atom(true);

/** Toggle Project Assistant Pane visibility (uses app root default Jotai store). */
export function toggleAssistantPaneVisibility() {
  getDefaultStore().set(assistantPaneOpenAtom, (open) => !open);
}

/** Open the Project Assistant Pane. */
export function openAssistantPane() {
  getDefaultStore().set(assistantPaneOpenAtom, true);
}
