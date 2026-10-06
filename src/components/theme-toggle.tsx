"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "takt-tema";

type Theme = "light" | "dark";

/* The <html> attribute is the single source of truth: a script in the document
 * head sets it before the first paint, so by the time React runs the screen is
 * already in one theme or the other. Reading it through an external store —
 * rather than copying it into state in an effect — keeps the button from ever
 * disagreeing with what is on screen. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** The server cannot know the device's choice; the script settles it first. */
function onServer(): Theme {
  return "light";
}

function choose(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private browsing: the choice holds for this page and no longer.
  }
  for (const notify of listeners) notify();
}

const OPTIONS = [
  { value: "light", Icon: Sun, label: "Tema claro" },
  { value: "dark", Icon: Moon, label: "Tema escuro" },
] as const;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, onServer);

  // Strict Mode's development remount resets the attributes on <html> to the
  // ones React renders from JSX, wiping what the head script set. Putting it
  // back before paint costs nothing in production, where it never happens.
  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    const want = stored === "dark" || stored === "light" ? stored : current();
    if (document.documentElement.getAttribute("data-theme") !== want) {
      document.documentElement.setAttribute("data-theme", want);
      for (const notify of listeners) notify();
    }
  }, []);

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex items-center gap-0.5 rounded-full border border-line bg-panel-2 p-0.5"
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => choose(value)}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              active ? "bg-accent text-on-accent" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            <Icon className="h-[15px] w-[15px]" />
          </button>
        );
      })}
    </div>
  );
}
