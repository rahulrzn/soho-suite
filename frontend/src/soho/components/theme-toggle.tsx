import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

import { applyTheme } from "../theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  function toggleTheme(button: HTMLButtonElement) {
    const nextDark = !dark;
    const update = () => flushSync(() => {
      setDark(nextDark);
      applyTheme(nextDark);
    });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (reducedMotion || !viewTransitionDocument.startViewTransition) {
      update();
      return;
    }

    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--theme-reveal-x", `${x}px`);
    rootStyle.setProperty("--theme-reveal-y", `${y}px`);
    rootStyle.setProperty("--theme-reveal-radius", `${radius}px`);

    try {
      const transition = viewTransitionDocument.startViewTransition(update);
      const clearOrigin = () => {
        rootStyle.removeProperty("--theme-reveal-x");
        rootStyle.removeProperty("--theme-reveal-y");
        rootStyle.removeProperty("--theme-reveal-radius");
      };
      void transition.finished.then(clearOrigin, clearOrigin);
    } catch {
      rootStyle.removeProperty("--theme-reveal-x");
      rootStyle.removeProperty("--theme-reveal-y");
      rootStyle.removeProperty("--theme-reveal-radius");
      update();
    }
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      aria-label={label}
      title={label}
      onClick={(event) => toggleTheme(event.currentTarget)}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
