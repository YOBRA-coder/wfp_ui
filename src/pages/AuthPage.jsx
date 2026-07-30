// ─── Auth page ────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C } from "../utils/constants.jsx";
import { Btn, Inp, FG, ErrBox } from "../shared/Shared.jsx";
import { API } from "../api/Api.jsx";

export default function AuthPage({ onLogin }) {
  const [tab,  setTab]  = useState("login");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const fillDemo = () => setForm({ email: "yobby@forexpro.com", password: "demo123", username: "" });

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`${API}${tab === "login" ? "/auth/login" : "/auth/register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      onLogin(data.token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
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

        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {["login", "register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{
              flex: 1, padding: "8px 0", background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t ? C.gold : "transparent"}`,
              color: tab === t ? C.gold : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all .15s",
            }}>{t === "login" ? "Sign In" : "Register"}</button>
          ))}
        </div>

        <FG label="Email"><Inp type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></FG>
        {tab === "register" && <FG label="Username"><Inp placeholder="Choose a username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} /></FG>}
        <FG label="Password"><Inp type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></FG>

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

        <button onClick={fillDemo} style={{
          width: "100%", marginTop: 12, background: "transparent", border: "none",
          color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
        }}>
          Use demo credentials
        </button>
      </div>
    </div>
  );
}
