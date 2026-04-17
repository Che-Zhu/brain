import React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function getServerSnapshot() {
  return false;
}

/** Matches Tailwind `md` (768px): below that width we treat as mobile for sidebar Sheet. */
export function useIsMobile() {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(QUERY);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(QUERY).matches,
    getServerSnapshot
  );
}
