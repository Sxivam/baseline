// Session store — profile, parsed markers, cycle log, generated nudges.
// Persisted to localStorage so a refresh mid-demo doesn't lose state.

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CycleLog, NudgePayload, ParseResult, Profile } from "./types";

interface BaselineState {
  profile: Profile | null;
  parse: ParseResult | null;
  cycle: CycleLog | null;
  nudges: Record<string, NudgePayload>; // keyed by markerId

  setProfile: (p: Profile) => void;
  setParse: (r: ParseResult) => void;
  setCycle: (c: CycleLog) => void;
  setNudge: (markerId: string, n: NudgePayload) => void;
  reset: () => void;
}

export const useBaseline = create<BaselineState>()(
  persist(
    (set) => ({
      profile: null,
      parse: null,
      cycle: null,
      nudges: {},

      setProfile: (profile) => set({ profile }),
      setParse: (parse) => set({ parse }),
      setCycle: (cycle) => set({ cycle }),
      setNudge: (markerId, n) =>
        set((s) => ({ nudges: { ...s.nudges, [markerId]: n } })),
      reset: () => set({ profile: null, parse: null, cycle: null, nudges: {} }),
    }),
    { name: "baseline-store" },
  ),
);

/**
 * True once the component has mounted on the client. Gate any UI that reads
 * persisted store state on this to avoid SSR/hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
