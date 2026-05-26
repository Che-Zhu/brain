export interface ProjectCreationPaneState {
  open: boolean;
  resetKey: number;
}

export type ProjectCreationPaneStateAction =
  | { type: "close" }
  | { type: "open" };

export const initialProjectCreationPaneState: ProjectCreationPaneState = {
  open: false,
  resetKey: 0,
};

export function projectCreationPaneStateReducer(
  state: ProjectCreationPaneState,
  action: ProjectCreationPaneStateAction
): ProjectCreationPaneState {
  switch (action.type) {
    case "open":
      return { open: true, resetKey: state.resetKey + 1 };
    case "close":
      return { ...state, open: false };
    default:
      return state;
  }
}
