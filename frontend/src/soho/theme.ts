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
