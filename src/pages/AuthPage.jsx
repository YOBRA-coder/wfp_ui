// ─── Auth page ────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C } from "../utils/constants.jsx";
import { Btn, Inp, FG, ErrBox, OkBox } from "../shared/Shared.jsx";
import { API } from "../api/Api.jsx";
import PasswordField from "../shared/PasswordField.jsx";

async function api(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Error");
  return data;
}

export default function AuthPage({ onLogin }) {
  // tab: "login" | "register" | "forgot" (request OTP) | "reset" (enter OTP + new password)
  const [tab,  setTab]  = useState("login");
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", username: "" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState("");

  // Forgot/reset flow state
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const fillDemo = () => setForm(p => ({ ...p, email: "yobby@forexpro.com", password: "demo123", username: "" }));

  const submit = async () => {
    setErr("");
    if (tab === "register" && form.password !== form.confirmPassword) {
      setErr("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const data = await api(tab === "login" ? "/auth/login" : "/auth/register", form);
      onLogin(data.token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitForgot = async () => {
    setErr(""); setBusy(true);
    try {
      await api("/auth/forgot-password", { email: resetEmail });
      setOk("If that email has an account, a 6-digit code is on its way — check your inbox.");
      setTab("reset");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitReset = async () => {
    setErr("");
    if (newPassword !== confirmNewPassword) { setErr("Passwords don't match"); return; }
    if (newPassword.length < 8) { setErr("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const data = await api("/auth/reset-password", { email: resetEmail, otp, new_password: newPassword });
      // reset-password only returns a token, not the full user — fetch it before logging in.
      const meRes = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } });
      const me = await meRes.json();
      onLogin(data.token, me.user || me);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const goToForgot = () => {
    setErr(""); setOk("");
    setResetEmail(form.email || "");
    setTab("forgot");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(1100px 520px at 15% -10%, ${C.gold}12, transparent 60%),
                   radial-gradient(900px 480px at 110% 10%, ${C.blue}14, transparent 55%),
                   ${C.bg}`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Forex<span style={{ color: C.gold }}>Pro</span></div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>AI Signals · Copy Trading · Live Markets</div>
        </div>

        {(tab === "login" || tab === "register") && (
          <>
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
              {["login", "register"].map(t => (
                <button key={t} onClick={() => { setTab(t); setErr(""); setOk(""); }} style={{
                  flex: 1, padding: "8px 0", background: "transparent", border: "none",
                  borderBottom: `2px solid ${tab === t ? C.gold : "transparent"}`,
                  color: tab === t ? C.gold : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all .15s",
                }}>{t === "login" ? "Sign In" : "Register"}</button>
              ))}
            </div>

            <FG label="Email"><Inp type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></FG>
            {tab === "register" && <FG label="Username"><Inp placeholder="Choose a username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} /></FG>}
            <FG label="Password">
              <PasswordField
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                showStrength={tab === "register"}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
            </FG>
            {tab === "register" && (
              <FG label="Repeat Password">
                <PasswordField
                  value={form.confirmPassword}
                  onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                />
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>Passwords don't match</div>
                )}
              </FG>
            )}

            {tab === "register" && (
              <div style={{
                fontSize: 11, color: C.muted, background: C.surf2, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: 10, marginBottom: 14, lineHeight: 1.6,
              }}>
                A one-time registration fee unlocks full platform access after you sign up —
                you'll be prompted to pay via M-Pesa or card on the next screen.
              </div>
            )}

            <ErrBox msg={err} />
            <Btn col={C.gold} full onClick={submit} disabled={busy}>{busy ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}</Btn>

            {tab === "login" && (
              <button onClick={goToForgot} style={{
                width: "100%", marginTop: 12, background: "transparent", border: "none",
                color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
              }}>
                Reset your password
              </button>
            )}
          </>
        )}

        {tab === "forgot" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Reset your password</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
              Enter your account email — we'll send a 6-digit code to reset your password.
            </div>
            <FG label="Email"><Inp type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} /></FG>
            <ErrBox msg={err} />
            <Btn col={C.gold} full onClick={submitForgot} disabled={busy || !resetEmail}>{busy ? "Sending…" : "Send Reset Code"}</Btn>
            <button onClick={() => { setTab("login"); setErr(""); setOk(""); }} style={{
              width: "100%", marginTop: 12, background: "transparent", border: "none",
              color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
            }}>
              ← Back to sign in
            </button>
          </>
        )}

        {tab === "reset" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Enter your code</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
              Sent to <strong style={{ color: C.text }}>{resetEmail}</strong> — expires in 10 minutes.
            </div>
            <OkBox msg={ok} />
            <FG label="6-digit code">
              <Inp
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                style={{ fontSize: 20, letterSpacing: 8, textAlign: "center", fontFamily: "monospace" }}
              />
            </FG>
            <FG label="New Password">
              <PasswordField value={newPassword} onChange={e => setNewPassword(e.target.value)} showStrength autoComplete="new-password" />
            </FG>
            <FG label="Repeat New Password">
              <PasswordField value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} autoComplete="new-password" />
              {confirmNewPassword && confirmNewPassword !== newPassword && (
                <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>Passwords don't match</div>
              )}
            </FG>
            <ErrBox msg={err} />
            <Btn col={C.gold} full onClick={submitReset} disabled={busy || otp.length !== 6 || !newPassword}>
              {busy ? "Resetting…" : "Reset Password & Sign In"}
            </Btn>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <button onClick={submitForgot} disabled={busy} style={{
                background: "transparent", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
              }}>
                Resend code
              </button>
              <button onClick={() => { setTab("login"); setErr(""); setOk(""); }} style={{
                background: "transparent", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
              }}>
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}