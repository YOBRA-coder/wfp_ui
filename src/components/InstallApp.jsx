// ─── Install App (PWA) ──────────────────────────────────────────────────────
// Chrome/Edge/Android fire `beforeinstallprompt`, which we capture and can
// trigger later from a real button click (browsers require a user gesture —
// you can't just call .prompt() on page load). iOS Safari never fires this
// event at all — "Add to Home Screen" there is a manual Share-sheet action,
// so we detect iOS and show instructions instead of a fake button.
import { useState, useEffect } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Btn } from "../shared/Shared.jsx";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches
    || window.navigator.standalone === true; // iOS Safari's own flag
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setOutcome(choice.outcome === "accepted" ? "Installed!" : "Maybe next time.");
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <Card>
        <SectionTitle>Install App</SectionTitle>
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Installed — you're running the app version.</div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Install App</SectionTitle>
      {deferredPrompt ? (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Install YobbyForex on this device — it'll open full-screen like a normal app, work offline for cached screens, and add an icon to your home screen.
          </div>
          <Btn col={C.gold} onClick={install}>Install App</Btn>
          {outcome && <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{outcome}</div>}
        </>
      ) : isIOS() ? (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          On iPhone/iPad: tap the <strong>Share</strong> button in Safari (square with an arrow), then
          <strong> "Add to Home Screen"</strong>. iOS doesn't support one-tap install from within the app itself.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          Your browser hasn't offered an install prompt yet — try reloading the page, or look for
          "Install app" / "Add to Home Screen" in your browser's menu (⋮ or Share icon).
        </div>
      )}
    </Card>
  );
}
