"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "takt-borrar";

/* Same arrangement as the theme switch: the attribute on <html> is the truth,
 * a script in the head puts it there before the first paint, and this reads it
 * back. Kept in sessionStorage rather than localStorage — it is turned on to
 * take a screenshot, not to work that way forever, so it lasts as long as the
 * tab and no longer. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function current() {
  return document.documentElement.getAttribute("data-privacy") === "on";
}

function onServer() {
  return false;
}

function toggle(next: boolean) {
  const root = document.documentElement;
  if (next) root.setAttribute("data-privacy", "on");
  else root.removeAttribute("data-privacy");
  try {
    if (next) sessionStorage.setItem(KEY, "on");
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private browsing: it holds for this page and no longer.
  }
  for (const notify of listeners) notify();
}

export function PrivacyToggle() {
  const on = useSyncExternalStore(subscribe, current, onServer);

  return (
    <button
      type="button"
      aria-pressed={on}
      title={
        on
          ? "Mostrar os nomes de novo"
          : "Borrar os nomes da loja e do cliente, para dar print"
      }
      aria-label={on ? "Mostrar os nomes" : "Borrar os nomes para dar print"}
      onClick={() => toggle(!on)}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        on
          ? "border-accent/40 bg-accent/15 text-accent-ink"
          : "border-line bg-panel-2 text-ink-3 hover:text-ink-2"
      }`}
    >
      {on ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
    </button>
  );
}
