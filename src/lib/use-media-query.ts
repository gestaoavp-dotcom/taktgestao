"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, read the way the theme switch reads the
 * document: through an external store, so there is no state copied in an
 * effect and no extra paint before the right answer arrives.
 *
 * The server cannot know, so it answers false and the client corrects on
 * hydration — which is right for a layout whose wide form is the default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
