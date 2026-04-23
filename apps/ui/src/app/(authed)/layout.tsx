import type { ReactNode } from "react";

// TODO(lib/auth): Sealos SDK gate — redirect unauthenticated users to login.
// Foundation commit ships as passthrough so the route-group boundary exists;
// auth wiring is a one-file change here when lib/auth lands.
export default function AuthedLayout({ children }: { children: ReactNode }) {
  return children;
}
