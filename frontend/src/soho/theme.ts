const preferenceKey = "sohosuite.theme";

export function initializeTheme() {
  let preference: string | null = null;
  try {
    preference = localStorage.getItem(preferenceKey);
  } catch {
    // Storage can be unavailable in private browsing; system appearance still works.
  }

  const dark = preference === "dark"
    || (preference !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  applyTheme(dark, false);
}

export function applyTheme(dark: boolean, persist = true) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  if (persist) {
    try {
      localStorage.setItem(preferenceKey, dark ? "dark" : "light");
    } catch {
      // The current session still gets the selected theme if storage is unavailable.
    }
  }
}

export function toggleTheme(originElement?: HTMLElement | null) {
  const isDark = document.documentElement.classList.contains("dark");
  const nextDark = !isDark;

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const viewTransitionDoc = typeof document !== "undefined" ? (document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  }) : null;

  const button = originElement ?? (typeof document !== "undefined" ? document.querySelector<HTMLElement>(".theme-toggle") : null);

  if (!reducedMotion && viewTransitionDoc?.startViewTransition && button) {
    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--theme-reveal-x", `${x}px`);
    rootStyle.setProperty("--theme-reveal-y", `${y}px`);
    rootStyle.setProperty("--theme-reveal-radius", `${radius}px`);

    try {
      const transition = viewTransitionDoc.startViewTransition(() => {
        applyTheme(nextDark);
      });
      const clearOrigin = () => {
        rootStyle.removeProperty("--theme-reveal-x");
        rootStyle.removeProperty("--theme-reveal-y");
        rootStyle.removeProperty("--theme-reveal-radius");
      };
      void transition.finished.then(clearOrigin, clearOrigin);
      return nextDark;
    } catch {
      rootStyle.removeProperty("--theme-reveal-x");
      rootStyle.removeProperty("--theme-reveal-y");
      rootStyle.removeProperty("--theme-reveal-radius");
    }
  }

  applyTheme(nextDark);
  return nextDark;
}
