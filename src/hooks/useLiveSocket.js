// ─── useLiveSocket ───────────────────────────────────────────────────────────
// A tiny shared WebSocket manager. Several components (Ticker, PricesPage,
// Signals page, Dashboard widgets, ...) all want the *same* /ws/prices or
// /ws/signals stream. Instead of each one opening its own socket, this
// keeps a single real connection per URL and fans messages out to every
// subscriber — with automatic reconnect + exponential backoff if the
// backend restarts or the connection drops.
import { useEffect, useRef, useState } from "react";

const registry = new Map(); // url -> { ws, listeners:Set, status, retryDelay, timer }

function connect(url, entry) {
  let ws;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleRetry(url, entry);
    return;
  }
  entry.ws = ws;
  entry.status = "connecting";

  ws.onopen = () => {
    entry.status = "open";
    entry.retryDelay = 1000;
    entry.listeners.forEach((fn) => fn({ __status: "open" }));
  };
  ws.onmessage = (evt) => {
    let data;
    try {
      data = JSON.parse(evt.data);
    } catch {
      return;
    }
    entry.listeners.forEach((fn) => fn(data));
  };
  ws.onclose = () => {
    entry.status = "closed";
    entry.listeners.forEach((fn) => fn({ __status: "closed" }));
    if (entry.listeners.size > 0) scheduleRetry(url, entry);
  };
  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      /* noop */
    }
  };
}

function scheduleRetry(url, entry) {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => connect(url, entry), entry.retryDelay);
  entry.retryDelay = Math.min(entry.retryDelay * 1.6, 15000);
}

function getEntry(url) {
  let entry = registry.get(url);
  if (!entry) {
    entry = { ws: null, listeners: new Set(), status: "connecting", retryDelay: 1000, timer: null };
    registry.set(url, entry);
    connect(url, entry);
  }
  return entry;
}

/**
 * Subscribe to a live WebSocket channel.
 * @param {string|null} url - full ws:// or wss:// URL, or null/undefined to skip connecting
 * @param {(data:any)=>void} onMessage - called with each parsed JSON message,
 *   plus synthetic {__status:"open"|"closed"} events on connect/disconnect
 */
export function useLiveSocket(url, onMessage) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    if (!url) return undefined;
    const entry = getEntry(url);
    setStatus(entry.status);
    const listener = (data) => {
      if (data && data.__status) setStatus(data.__status);
      cbRef.current && cbRef.current(data);
    };
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
      if (entry.listeners.size === 0) {
        clearTimeout(entry.timer);
        try {
          entry.ws && entry.ws.close();
        } catch {
          /* noop */
        }
        registry.delete(url);
      }
    };
  }, [url]);

  return status;
}
