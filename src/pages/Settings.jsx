// ─── Settings ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Btn, FG, Inp, Sel, OkBox, ErrBox, useMobile } from "../shared/Shared.jsx";
import InstallApp from "../components/InstallApp.jsx";
import PushNotifications from "../components/PushNotifications.jsx";
import PasswordField from "../shared/PasswordField.jsx";

export default function Settings({ api, user, setUser }) {
  const mobile = useMobile();
  const [prefs, setPrefs] = useState({
    email_alerts_enabled: user?.email_alerts_enabled !== 0,
    default_lot_size: user?.default_lot_size ?? 0.02,
    default_risk_pct: user?.default_risk_pct ?? 2,
  });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [pwdOk, setPwdOk] = useState("");
  const [err, setErr] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  const [tg, setTg] = useState(null); // { connected, username, bot_configured }
  const [tgLink, setTgLink] = useState(null); // { code, deep_link, expires_at }
  const [tgBusy, setTgBusy] = useState(false);
  const [tgErr, setTgErr] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    api.get("/telegram/status").then(setTg).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTelegramLink = async () => {
    setTgBusy(true); setTgErr("");
    try {
      const res = await api.post("/telegram/link/start", {});
      setTgLink(res);
      pollRef.current = setInterval(async () => {
        const s = await api.get("/telegram/status").catch(() => null);
        if (s?.connected) {
          setTg(s); setTgLink(null);
          clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (e) { setTgErr(e.message); }
    finally { setTgBusy(false); }
  };

  const unlinkTelegram = async () => {
    setTgBusy(true); setTgErr("");
    try { await api.post("/telegram/unlink", {}); setTg(t => ({ ...t, connected: false, username: null })); }
    catch (e) { setTgErr(e.message); }
    finally { setTgBusy(false); }
  };

  const saveTrading = async () => {
    setBusy(true); setErr(""); setOk("");
    try {
      const res = await api.put("/auth/settings", prefs);
      setUser(u => ({ ...u, ...res.user }));
      setOk("Saved");
      setTimeout(() => setOk(""), 2500);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const savePassword = async () => {
    setPwdErr(""); setPwdOk("");
    if (pwd.new_password !== pwd.confirm) { setPwdErr("New passwords don't match"); return; }
    if (pwd.new_password.length < 8) { setPwdErr("New password must be at least 8 characters"); return; }
    setPwdBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: pwd.current_password, new_password: pwd.new_password });
      setPwd({ current_password: "", new_password: "", confirm: "" });
      setPwdOk("Password updated");
      setTimeout(() => setPwdOk(""), 2500);
    } catch (e) { setPwdErr(e.message); }
    finally { setPwdBusy(false); }
  };

  return (
    <div style={{ padding: mobile ? 12 : 20, marginBottom: 100, maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Settings</SectionTitle>

      {!user?.email_verified && (
        <Card style={{ borderColor: C.gold }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.gold }}>⚠ Verify your email</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Check {user?.email} for a verification link.</div>
            </div>
            <Btn col={C.gold} ghost onClick={async () => {
              try { const r = await api.post("/auth/resend-verification", {}); alert(r.sent ? "Sent — check your inbox." : "Couldn't send — email isn't configured on this server yet."); }
              catch (e) { alert(e.message); }
            }} style={{ fontSize: 11, padding: "6px 12px" }}>Resend Email</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Notifications</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text, cursor: "pointer", marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={prefs.email_alerts_enabled}
            onChange={e => setPrefs(p => ({ ...p, email_alerts_enabled: e.target.checked }))}
          />
          Email me when a signal auto-copies or a trade closes
        </label>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          In-app notifications (bell icon) always stay on — this only controls email alerts.
        </div>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Default trade sizing</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
          <FG label="Default lot size">
            <Inp type="number" step="0.01" value={prefs.default_lot_size}
                 onChange={e => setPrefs(p => ({ ...p, default_lot_size: Number(e.target.value) }))} />
          </FG>
          <FG label="Default risk %">
            <Inp type="number" step="0.5" value={prefs.default_risk_pct}
                 onChange={e => setPrefs(p => ({ ...p, default_risk_pct: Number(e.target.value) }))} />
          </FG>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          Used as the starting point when you manually copy a signal from the Signals page.
        </div>

        {ok && <OkBox msg={ok} />}
        <ErrBox msg={err} />
        <Btn col={C.gold} onClick={saveTrading} disabled={busy}>{busy ? "Saving…" : "Save Settings"}</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Change password</div>
        <FG label="Current password"><PasswordField value={pwd.current_password} onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))} autoComplete="current-password" /></FG>
        <FG label="New password"><PasswordField value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} showStrength autoComplete="new-password" /></FG>
        <FG label="Confirm new password">
          <PasswordField value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
          {pwd.confirm && pwd.confirm !== pwd.new_password && (
            <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>Passwords don't match</div>
          )}
        </FG>
        {pwdOk && <OkBox msg={pwdOk} />}
        <ErrBox msg={pwdErr} />
        <Btn col={C.gold} onClick={savePassword} disabled={pwdBusy}>{pwdBusy ? "Updating…" : "Update Password"}</Btn>
      </Card>

      <InstallApp />
      <PushNotifications api={api} />

      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Telegram Alerts</div>
        {!tg ? (
          <div style={{ fontSize: 12, color: C.muted }}>Loading…</div>
        ) : !tg.bot_configured ? (
          <div style={{ fontSize: 12, color: C.muted }}>Telegram isn't set up on this server yet.</div>
        ) : tg.connected ? (
          <>
            <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 8 }}>
              ✓ Connected as @{tg.username || "your Telegram account"}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              You'll get a Telegram message whenever a provider you follow posts a new signal — on top of the
              in-app notification, not instead of it.
            </div>
            <Btn col={C.muted} ghost onClick={unlinkTelegram} disabled={tgBusy}>{tgBusy ? "…" : "Disconnect"}</Btn>
          </>
        ) : tgLink ? (
          <>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              Open Telegram and tap below (or search for the bot and send <code>/start {tgLink.code}</code>).
              Waiting for confirmation…
            </div>
            <a href={tgLink.deep_link} target="_blank" rel="noreferrer">
              <Btn col={C.gold} full>Open Telegram to Confirm</Btn>
            </a>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: "center" }}>Code expires in 10 minutes.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              Get signal alerts for the specific providers you follow, sent straight to Telegram.
            </div>
            <ErrBox msg={tgErr} />
            <Btn col={C.gold} onClick={startTelegramLink} disabled={tgBusy}>{tgBusy ? "…" : "Connect Telegram"}</Btn>
          </>
        )}
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>MT5 connection</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
          Managed from your Profile page — broker, login/server display, and the bridge token for live copy execution.
        </div>
        <NavLink to="/profile"><Btn col={C.muted} ghost>Go to Profile →</Btn></NavLink>
      </Card>
    </div>
  );
}
