// ─── Push Notifications ─────────────────────────────────────────────────────
// Real device notifications for the installed PWA — works even when the app
// isn't open in a tab. Requires: HTTPS (or localhost), a registered service
// worker (see src/sw.js), and the backend's VAPID key configured.
import { useState, useEffect } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Btn, ErrBox } from "../shared/Shared.jsx";

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

  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, []);

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
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            You'll get a notification here for signals from providers you follow and when your trades close —
            even when the app isn't open.
          </div>
          <Btn col={C.muted} ghost onClick={disable} disabled={busy}>{busy ? "…" : "Turn off"}</Btn>
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
