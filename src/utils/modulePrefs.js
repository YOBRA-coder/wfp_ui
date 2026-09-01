// ─── Module toggle preferences ────────────────────────────────────────────────
// Simple per-device (not account-synced) on/off switches for optional
// dashboard widgets — starting with the news feed. Deliberately not synced
// through /prefs like the watchlist/timeframe/indicators are: those are
// trading setup a person wants identical on every device, this is just a
// "do I want to see this panel" toggle, closer to the theme setting.
import { useState } from "react";

const PREFIX = "yobbyfx_module_";

export function useModulePref(key, defaultValue) {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  });

  const set = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    setValue(resolved);
    try {
      localStorage.setItem(storageKey, JSON.stringify(resolved));
    } catch {
      /* noop — localStorage unavailable (private mode, quota) */
    }
  };

  return [value, set];
}
