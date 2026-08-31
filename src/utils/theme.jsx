// ─── Theme system ────────────────────────────────────────────────────────────
// Three real palettes ("dark" — the platform default, "black" — OLED-style
// true black, "light") plus an "auto" setting that follows the OS/browser's
// prefers-color-scheme and re-resolves live if the person flips their system
// theme mid-session. The chosen *setting* (auto/dark/black/light) persists in
// localStorage; the *resolved* palette (dark/black/light) is what auto maps
// to right now and is what applyPalette() actually paints with.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyPalette } from "./constants.jsx";

const STORAGE_KEY = "yobbyfx_theme_setting";
const VALID_SETTINGS = ["auto", "dark", "black", "light"];

function readStoredSetting() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID_SETTINGS.includes(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

function systemPrefersLight() {
  return typeof window !== "undefined" &&
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
}

function resolve(setting) {
  if (setting === "auto") return systemPrefersLight() ? "light" : "dark";
  return setting;
}

// Apply the resolved palette synchronously the moment this module loads —
// before React's very first render — so a returning visitor on light/auto
// never sees a flash of the dark default before the effect below catches up.
applyPalette(resolve(readStoredSetting()));

const ThemeContext = createContext({
  themeSetting: "auto",
  resolvedTheme: "dark",
  setThemeSetting: () => {},
});

export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSettingState] = useState(readStoredSetting);
  // Bumped only to force a re-render when the OS scheme flips while on "auto".
  const [, forceTick] = useState(0);

  const resolvedTheme = resolve(themeSetting);

  // Deliberately a synchronous side effect during render, not inside a
  // useEffect: React fires effects bottom-up (children before parents), so
  // a descendant's own effect — e.g. the price chart rebuilding itself in
  // response to this same theme change — could otherwise run before this
  // provider's effect and read the palette one render behind. Doing it here
  // guarantees every descendant sees the new palette by the time it renders
  // or its effects run. Object.assign is idempotent, so re-running this on
  // StrictMode's dev-mode double-render is harmless.
  applyPalette(resolvedTheme);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, themeSetting); } catch { /* noop */ }
  }, [themeSetting]);

  // While on "auto", keep watching the OS-level preference so a system theme
  // change (e.g. sunset-triggered dark mode) repaints the app without a reload.
  useEffect(() => {
    if (themeSetting !== "auto" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => forceTick((t) => t + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeSetting]);

  const value = useMemo(
    () => ({ themeSetting, resolvedTheme, setThemeSetting: setThemeSettingState }),
    [themeSetting, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
