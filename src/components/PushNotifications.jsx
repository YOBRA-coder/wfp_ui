// ─── Push Notifications ─────────────────────────────────────────────────────
// Real device notifications for the installed PWA — works even when the app
// isn't open in a tab. Requires: HTTPS (or localhost), a registered service
// worker (see src/sw.js), and the backend's VAPID key configured.
import { useState, useEffect } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Btn, ErrBox } from "../shared/Shared.jsx";

const CATEGORY_LABELS = {
  signal: ["Signals", "New signals from providers you follow"],
  copy: ["Copy Trading", "Trade copied, closed, or needs your review"],
  trade_closed: ["Trade Closes", "SL/TP hits and MT5 fills on real trades"],
  billing: ["Billing & Wallet", "Deposits, subscription renewals, withdrawals"],
  system: ["Account", "Email verified, MT5 bridge disconnects, Telegram linked"],
  education: ["Education", "Course completions and milestones"],
};

// Web Push wants the VAPID key as a raw Uint8Array, not the base64url string
// the backend gives us — this is the standard conversion.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export default function PushNotifications({ api }) {
  const [permission, setPermission] = useState(isSupported() ? Notification.permission : "unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [serverReady, setServerReady] = useState(true);
  const [categories, setCategories] = useState(null); // null while loading

  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/prefs/notifications").then((d) => setCategories(d.categories)).catch(() => setCategories({}));
  }, [api]);

  const toggleCategory = (key) => {
    setCategories((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      api.put("/prefs/notifications", { categories: { [key]: next[key] } }).catch(() => {});
      return next;
    });
  };

  const enable = async () => {
    setBusy(true); setErr("");
    try {
      const { key, configured } = await api.get("/push/vapid-public-key");
      if (!configured) { setServerReady(false); return; }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setErr("Notifications were blocked — enable them in your browser's site settings to turn this on."); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      await api.post("/push/subscribe", {
        endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
      });
      setSubscribed(true);
    } catch (e) {
      setErr(e.message || "Couldn't enable notifications on this device.");
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setErr("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post(`/push/unsubscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (!isSupported()) {
    return (
      <Card>
        <SectionTitle>Push Notifications</SectionTitle>
        <div style={{ fontSize: 12, color: C.muted }}>
          Not supported in this browser. On iPhone, this needs iOS 16.4+ and the app installed via
          "Add to Home Screen" first — Safari alone can't do push.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Push Notifications</SectionTitle>
      {!serverReady ? (
        <div style={{ fontSize: 12, color: C.muted }}>Push isn't configured on this server yet (missing VAPID keys).</div>
      ) : subscribed ? (
        <>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 8 }}>✓ Enabled on this device</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            You'll get a notification here for signals from providers you follow and when your trades close —
            even when the app isn't open.
          </div>

          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>What sends a push</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Everything still shows up in your notification bell either way — this only controls what's worth
            interrupting you for.
          </div>
          {categories === null ? (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Loading…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {Object.entries(CATEGORY_LABELS).map(([key, [label, desc]]) => (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: C.text, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={categories[key] !== false}
                    onChange={() => toggleCategory(key)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: C.muted }}>{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <Btn col={C.muted} ghost onClick={disable} disabled={busy}>{busy ? "…" : "Turn off all push"}</Btn>
        </>
      ) : permission === "denied" ? (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          Notifications are blocked for this site. Enable them in your browser's site settings (usually the
          padlock/info icon next to the address bar), then reload this page.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Get notified the moment a provider you follow posts a signal, or a trade closes — even with the app closed.
          </div>
          <ErrBox msg={err} />
          <Btn col={C.gold} onClick={enable} disabled={busy}>{busy ? "…" : "Enable Notifications"}</Btn>
        </>
      )}
    </Card>
  );
}
