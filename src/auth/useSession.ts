import { useSyncExternalStore } from "react";
import { hasSession, subscribeToSession } from "./session";

export function useSession(): boolean {
  return useSyncExternalStore(subscribeToSession, hasSession, () => false);
}
