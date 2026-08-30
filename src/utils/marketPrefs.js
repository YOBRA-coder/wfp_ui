// ─── Market preferences (DB-synced) ─────────────────────────────────────────
// A user's watchlist (favorite pairs), default timeframe, and indicator
// toggles. Used to live only in localStorage (single device). Now synced to
// the backend (/prefs/watchlist, /prefs/chart) so it follows the trader
// across devices — localStorage is kept as an instant-read cache so the UI
// has something to show before the network round-trip lands, and as a
// fallback when logged out or offline.
import { useCallback, useEffect, useRef, useState } from "react";
import { PAIRS } from "../components/Charts.jsx";

const KEY = "wfp_market_prefs_v1";

const DEFAULTS = {
  watchlist: [...PAIRS],
  timeframe: "H1",
  indicators: { ema: true, bb: true, sr: true, trendline: true, volume: true },
};

export function loadMarketPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      watchlist: Array.isArray(parsed.watchlist) && parsed.watchlist.length ? parsed.watchlist : [...DEFAULTS.watchlist],
      timeframe: parsed.timeframe || DEFAULTS.timeframe,
      indicators: { ...DEFAULTS.indicators, ...(parsed.indicators || {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMarketPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage unavailable (private mode, etc.) — prefs just won't persist locally */
  }
}

// ── DB-synced hook ───────────────────────────────────────────────────────
// Drop-in upgrade for the old `useState(loadMarketPrefs())` pattern: same
// shape (`prefs.watchlist` / `prefs.timeframe` / `prefs.indicators`), plus
// setters that update local state instantly AND push to the backend so the
// change survives a reinstall / new device. `api` is the object returned by
// useApi() — pass null/undefined when logged out to stay localStorage-only.
export function useSyncedMarketPrefs(api, loggedIn) {
  const [prefs, setPrefsState] = useState(() => loadMarketPrefs());
  const loadedFromServer = useRef(false);

  // Pull from the server once we have a session, merging over local defaults
  // (server is the source of truth once logged in).
  useEffect(() => {
    if (!loggedIn || !api || loadedFromServer.current) return;
    loadedFromServer.current = true;
    (async () => {
      try {
        const [wl, ch] = await Promise.all([
          api.get("/prefs/watchlist").catch(() => null),
          api.get("/prefs/chart").catch(() => null),
        ]);
        setPrefsState((prev) => {
          const next = {
            watchlist: wl && wl.watchlist && wl.watchlist.length ? wl.watchlist : prev.watchlist,
            timeframe: (ch && ch.timeframe) || prev.timeframe,
            indicators: ch && ch.indicators ? { ...prev.indicators, ...ch.indicators } : prev.indicators,
          };
          saveMarketPrefs(next);
          return next;
        });
      } catch { /* offline/first-run — the localStorage cache already loaded above, so just carry on */ }
    })();
  }, [loggedIn, api]);

  const setWatchlist = useCallback((pairsOrFn) => {
    setPrefsState((prev) => {
      const watchlist = typeof pairsOrFn === "function" ? pairsOrFn(prev.watchlist) : pairsOrFn;
      const next = { ...prev, watchlist };
      saveMarketPrefs(next);
      if (loggedIn && api) api.put("/prefs/watchlist", { pairs: watchlist }).catch(() => {});
      return next;
    });
  }, [api, loggedIn]);

  const setTimeframe = useCallback((timeframe) => {
    setPrefsState((prev) => {
      const next = { ...prev, timeframe };
      saveMarketPrefs(next);
      if (loggedIn && api) api.put("/prefs/chart", { timeframe }).catch(() => {});
      return next;
    });
  }, [api, loggedIn]);

  const setIndicators = useCallback((indicatorsOrFn) => {
    setPrefsState((prev) => {
      const indicators = typeof indicatorsOrFn === "function" ? indicatorsOrFn(prev.indicators) : indicatorsOrFn;
      const next = { ...prev, indicators };
      saveMarketPrefs(next);
      if (loggedIn && api) api.put("/prefs/chart", { indicators }).catch(() => {});
      return next;
    });
  }, [api, loggedIn]);

  return { prefs, setWatchlist, setTimeframe, setIndicators };
}

export { DEFAULTS as MARKET_PREF_DEFAULTS };
