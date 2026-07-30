// ─── Profile / MT5 ────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal, OkBox, InfoBox, ErrBox } from "../shared/Shared.jsx";
import { ago, fp, f1 } from "../utils/utils.js";
import { API } from "../api/Api.jsx";

export default function Profile({ api, user, setUser }) {
  const [form, setForm] = useState({ bio: user?.bio || "", broker: user?.broker || "", mt5_login: user?.mt5_login || "", mt5_server: user?.mt5_server || "" });
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState("");

  const [bridge, setBridge] = useState(null); // { has_token, bridge_token, connected, last_seen }
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeErr, setBridgeErr] = useState("");
  const [copied, setCopied] = useState(false);

  const loadBridge = useCallback(() => {
    api.get("/bridge/status").then(setBridge).catch(() => {});
  }, [api]);

  useEffect(() => {
    loadBridge();
    const t = setInterval(loadBridge, 10000); // refresh connection dot every 10s
    return () => clearInterval(t);
  }, [loadBridge]);

  const generateToken = async () => {
    setBridgeBusy(true); setBridgeErr("");
    try {
      await api.post("/bridge/token/generate", {});
      loadBridge();
    } catch (e) {
      setBridgeErr(e.message || "Could not generate a bridge token");
    } finally {
      setBridgeBusy(false);
    }
  };

  const copyToken = () => {
    if (!bridge?.bridge_token) return;
    navigator.clipboard?.writeText(bridge.bridge_token);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.put("/auth/profile", form);
      setUser(u => ({ ...u, ...(res.user || form) }));
      setOk("Saved!"); setTimeout(() => setOk(""), 2500);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding: 20 }}>
      <Grid cols="1fr 1fr" gap={16}>
        <Card>
          <SectionTitle>Account Info</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.gold, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.username}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{user?.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                <Badge col={C.blue}>{user?.role?.toUpperCase()}</Badge>
                <Badge col={C.purple}>{user?.plan?.toUpperCase()} PLAN</Badge>
              </div>
            </div>
          </div>
          <Grid cols="1fr 1fr" gap={8} style={{ marginBottom: 16 }}>
            {[["ForexPro Balance (demo)", `$${Number(user?.balance || 0).toLocaleString()}`], ["ForexPro Equity (demo)", `$${Number(user?.equity || 0).toLocaleString()}`], ["Broker", user?.broker || "Not set"], ["MT5 Server", user?.mt5_server || "Not connected"]].map(([l, v]) => (
              <div key={l} style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 11 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{l}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </Grid>
          <FG label="Bio"><Inp rows={2} value={form.bio} onChange={F("bio")} placeholder="Describe your trading style…" /></FG>
          <OkBox msg={ok} />
          <Btn col={C.gold} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</Btn>
        </Card>

        <Card>
          <SectionTitle>MT5 / Broker Connection</SectionTitle>
          <InfoBox col={C.blue}>
            <div style={{ fontWeight: 600, fontSize: 12, color: C.blue, marginBottom: 7 }}>ℹ How to connect your MT5</div>
            <div style={{ fontSize: 11, lineHeight: 1.85, color: C.text, opacity: 0.85 }}>
              1. Open a live/demo account at <strong>FBS, Exness, XM</strong> or any MT5 broker<br />
              2. For $10–$50: choose <strong>FBS Cent Account</strong> ($1 min deposit, nano lots 0.001)<br />
              3. In MetaTrader 5, go to <em>Tools → Options → Server</em> to find your Login & Server<br />
              4. Save your credentials below — this is <strong>reference info only</strong>, so you (and support)
              can tell your accounts apart at a glance. It doesn't connect anything by itself.<br />
              5. To actually let ForexPro trade for real, set up the <strong>MT5 Bridge</strong> card below —
              that's the part that does something, via a small EA you run in your own terminal
            </div>
          </InfoBox>
          <FG label="Broker Name"><Inp value={form.broker} onChange={F("broker")} placeholder="FBS, Exness, XM, IC Markets…" /></FG>
          <FG label="MT5 Login Number"><Inp value={form.mt5_login} onChange={F("mt5_login")} placeholder="e.g. 38291047" /></FG>
          <FG label="MT5 Server"><Inp value={form.mt5_server} onChange={F("mt5_server")} placeholder="e.g. FBS-MT5-Demo" /></FG>
          {bridge?.account?.login && user?.mt5_login && bridge.account.login !== user.mt5_login && (
            <div style={{ fontSize: 11, color: C.gold, background: `${C.gold}14`, border: `1px solid ${C.gold}40`,
                          borderRadius: 8, padding: 9, marginBottom: 10 }}>
              ⚠ Your saved login ({user.mt5_login}) doesn't match the account your EA is actually connected to
              ({bridge.account.login}) — probably fine if you're testing on a different account than you noted here,
              but worth double-checking if that's not what you expect.
            </div>
          )}
          <OkBox msg={ok} />
          <Btn col={C.gold} full onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
          <InfoBox col={C.green} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, lineHeight: 1.75 }}>
              <strong>Best brokers for $10–$50:</strong><br />
              • <strong>FBS Cent</strong> — $1 min, 1:3000 leverage, nano lots<br />
              • <strong>Exness</strong> — $10 min, ultra-low spreads, FCA regulated<br />
              • <strong>XM</strong> — $5 min, $50 welcome bonus
            </div>
          </InfoBox>
        </Card>
      </Grid>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>MT5 Auto-Trading Bridge (Beta)</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: bridge?.connected ? C.green : C.muted,
              boxShadow: bridge?.connected ? `0 0 8px ${C.green}` : "none",
            }} />
            {bridge?.connected ? "Connected" : bridge?.has_token ? "Waiting for EA…" : "Not set up"}
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.7 }}>
          This lets ForexPro place <strong>real orders</strong> on your own MT5 account when you (or a provider you
          follow with live-execution on) choose "execute live." It works via a small Expert Advisor (EA) that runs
          inside your own MT5 terminal — nothing executes anywhere unless the EA is attached and running.
          <br /><br />
          <strong>Two separate balances, on purpose:</strong> your <em>ForexPro balance</em> (top of Dashboard) is a
          simulated ledger for demo/practice trades and never touches real money. Once this bridge is connected, a
          trade with "execute live" on uses your <strong>real MT5 account's own balance and margin</strong> — shown
          below once your EA is running — not the ForexPro one. They're intentionally never the same number; the app
          used to also deduct from your ForexPro balance for live trades, which double-counted the same trade twice —
          that's now fixed, live trades only affect your real MT5 account.
        </div>

        <ErrBox msg={bridgeErr} />

        {bridge?.account && (
          <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>YOUR REAL MT5 ACCOUNT</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Balance</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{bridge.account.balance?.toFixed(2)} {bridge.account.currency}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Equity</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: bridge.account.equity >= bridge.account.balance ? C.green : C.red }}>
                  {bridge.account.equity?.toFixed(2)} {bridge.account.currency}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Login</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{bridge.account.login}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Server</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{bridge.account.server}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Leverage</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>1:{bridge.account.leverage}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
              Reported by your EA {ago(bridge.account.updated_at)} — updates every ~10s while MT5 is open and connected.
            </div>
          </div>
        )}

        {!bridge?.has_token ? (
          <Btn col={C.gold} onClick={generateToken} disabled={bridgeBusy}>
            {bridgeBusy ? "Generating…" : "Generate Bridge Token"}
          </Btn>
        ) : (
          <>
            <FG label="Your bridge token — paste this into the EA's inputs">
              <div style={{ display: "flex", gap: 8 }}>
                <Inp value={bridge.bridge_token} readOnly onFocus={(e) => e.target.select()} />
                <Btn col={C.blue} onClick={copyToken} style={{ whiteSpace: "nowrap" }}>{copied ? "Copied!" : "Copy"}</Btn>
              </div>
            </FG>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <a href={`${API}/bridge/ea/download`} style={{ textDecoration: "none" }}>
                <Btn col={C.green}>⬇ Download ForexPro EA (.mq5)</Btn>
              </a>
              <Btn col={C.muted} ghost onClick={generateToken} disabled={bridgeBusy}>
                {bridgeBusy ? "Regenerating…" : "Regenerate Token"}
              </Btn>
            </div>
            {bridge.last_seen && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Last heartbeat: {ago(bridge.last_seen)}</div>
            )}
            <InfoBox col={C.blue} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                <strong>Setup:</strong><br />
                1. Open the downloaded file in MetaEditor (F4 in MT5), press F7 to compile<br />
                2. In MT5: <em>Tools → Options → Expert Advisors</em> → tick "Allow WebRequest for listed URL" and
                add <code style={{ background: C.surf2, padding: "1px 5px", borderRadius: 4 }}>{API}</code><br />
                3. Drag the compiled EA onto any chart, paste your bridge token into its inputs, enable AutoTrading<br />
                4. Turn on "execute live" when copying a signal or following a provider — the dot above turns green
                once the EA starts sending heartbeats
              </div>
            </InfoBox>
          </>
        )}
      </Card>
    </div>
  );
}
