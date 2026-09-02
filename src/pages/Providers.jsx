// ─── Providers ────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal, OkBox, InfoBox, ErrBox, useMobile } from "../shared/Shared.jsx";
import { ago, fp, f1 } from "../utils/utils.js";
import { PAIRS, CandleChart1 } from "../components/Charts.jsx";

// Lets a follower pick exactly which pairs to auto-copy from a provider.
// Empty = all pairs (mirrors the backend's `not pf` fallback in forexpro_main.py).
function PairsFilterPicker({ value, onChange }) {
  const toggle = (pair) => {
    onChange(value.includes(pair) ? value.filter(p => p !== pair) : [...value, pair]);
  };
  return (
    <FG label={`Pairs to copy (${value.length === 0 ? "all pairs" : value.length + " selected"})`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PAIRS.map(pair => {
          const active = value.includes(pair);
          return (
            <button
              key={pair}
              type="button"
              onClick={() => toggle(pair)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${active ? C.gold : C.border}`,
                background: active ? `${C.gold}20` : "transparent",
                color: active ? C.gold : C.muted,
              }}
            >
              {pair}
            </button>
          );
        })}
      </div>
    </FG>
  );
}

export default function Providers({ api }) {
  const [list,    setList]    = useState([]);
  const [detail,  setDetail]  = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [myIds,   setMyIds]   = useState([]);
  const [sf,      setSf]      = useState({ risk_pct: 2, max_lot: 0.05, min_confidence: 65, auto_copy: true, auto_execute: false, pairs_filter: [] });
  const [busy,    setBusy]    = useState(false);
  const [ok,      setOk]      = useState("");
  const [bridgeReady, setBridgeReady] = useState(false);
  const [usage, setUsage] = useState(null);

  const [myProvider, setMyProvider] = useState(undefined); // undefined = loading, null = not a provider
  const [followers, setFollowers] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [showEarnings, setShowEarnings] = useState(false);
  // A Recent Signals row had cursor:"pointer" styling but no onClick at all —
  // looked tappable, did nothing. Now tapping one opens this read-only panel:
  // the signal's own chart (its chart_data already has the OHLCV baked in
  // from generation time, no extra fetch needed) plus how many followers
  // copied it and how that went for them in aggregate.
  const [sigDetail, setSigDetail] = useState(null);
  const mobile = useMobile();
  const [regForm, setRegForm]       = useState({ display_name: "", description: "", monthly_fee: 0,
    subscription_type: "monthly", commission_pct: 25, preferred_pairs: [], preferred_timeframes: [],
    max_signals_per_day: 10, risk_notes: "" });
  const [regModal, setRegModal]     = useState(false);
  const [regBusy,  setRegBusy]      = useState(false);
  const [regErr,   setRegErr]       = useState("");
  const [subErr,   setSubErr]       = useState("");

  const [sigModal, setSigModal] = useState(false);
  const [sigForm, setSigForm] = useState({ pair: "EURUSD", timeframe: "H1", direction: "BUY",
    entry_price: "", stop_loss: "", take_profit: "", lot_size: 0.02, is_copyable: true,
    execution_mode: "immediate", trigger_price: "", execute_live: false, analysis: "" });
  const [sigBusy, setSigBusy] = useState(false);
  const [sigErr, setSigErr] = useState("");
  const [query, setQuery] = useState("");
  const [sigOk, setSigOk] = useState("");

  const loadEarnings = () => {
    api.get("/providers/me/earnings").then(setEarnings).catch(() => setEarnings(null));
  };

  const removeFollower = async (fid) => {
    try {
      await api.post(`/providers/me/followers/${fid}/remove`, {});
      loadFollowers();
      loadMyProvider();
    } catch (e) { alert(e.message); }
  };

  const submitSignal = async () => {
    setSigBusy(true); setSigErr(""); setSigOk("");
    try {
      const body = {
        ...sigForm,
        entry_price: Number(sigForm.entry_price), stop_loss: Number(sigForm.stop_loss),
        take_profit: Number(sigForm.take_profit), lot_size: Number(sigForm.lot_size),
        trigger_price: sigForm.execution_mode === "pending" ? Number(sigForm.trigger_price) : null,
      };
      const res = await api.post("/signals/manual", body);
      setSigOk(res.status === "pending_trigger"
        ? "Signal saved — will fire once price reaches your trigger."
        : `Live — your position is open${res.copies_distributed ? ` and copied to ${res.copies_distributed} follower(s)` : ""}.`);
      loadMyProvider();
      setTimeout(() => { setSigModal(false); setSigOk(""); }, 2000);
    } catch (e) { setSigErr(e.message); }
    finally { setSigBusy(false); }
  };

  const loadMyProvider = () => {
    api.get("/providers/me").then(setMyProvider).catch(() => setMyProvider(null));
  };

  const loadFollowers = () => {
    api.get("/providers/me/followers").then(d => setFollowers(d.followers || [])).catch(() => setFollowers([]));
  };

  useEffect(() => {
    api.get("/providers").then(d => setList(d.providers || [])).catch(() => {});
    api.get("/copy/subscriptions").then(d => setMyIds((d.subscriptions || []).map(s => s.provider_id))).catch(() => {});
    api.get("/bridge/status").then(d => setBridgeReady(!!d.has_token)).catch(() => {});
    api.get("/account/usage").then(setUsage).catch(() => {});
    loadMyProvider();
  }, []);

  const openRegister = () => {
    setRegErr("");
    setRegForm(myProvider ? {
      display_name: myProvider.display_name, description: myProvider.description, monthly_fee: myProvider.monthly_fee,
      subscription_type: myProvider.subscription_type || "monthly", commission_pct: myProvider.commission_pct ?? 25,
      preferred_pairs: JSON.parse(myProvider.preferred_pairs || "[]"),
      preferred_timeframes: JSON.parse(myProvider.preferred_timeframes || "[]"),
      max_signals_per_day: myProvider.max_signals_per_day ?? 10, risk_notes: myProvider.risk_notes || "",
    } : { display_name: "", description: "", monthly_fee: 0, subscription_type: "monthly", commission_pct: 25,
          preferred_pairs: [], preferred_timeframes: [], max_signals_per_day: 10, risk_notes: "" });
    setRegModal(true);
  };

  const submitProvider = async () => {
    setRegBusy(true); setRegErr("");
    try {
      let result;
      if (myProvider) {
        result = await api.put("/providers/me", regForm);
      } else {
        await api.post("/providers/register", { display_name: regForm.display_name, description: regForm.description, monthly_fee: regForm.monthly_fee });
        result = await api.put("/providers/me", regForm); // apply commission model + skills right away
      }
      setMyProvider(result);
      setRegModal(false);
      api.get("/providers").then(d => setList(d.providers || [])).catch(() => {});
    } catch (e) {
      setRegErr(e.message || "Something went wrong");
    } finally {
      setRegBusy(false);
    }
  };

  const openDetail = async p => {
    setSigDetail(null);
    try { setDetail(await api.get(`/providers/${p.id}`)); }
    catch {}
  };

  const subscribe = async () => {
    setBusy(true); setSubErr("");
    try {
      await api.post("/copy/subscribe", { provider_id: subForm.user_id, ...sf });
      setMyIds(p => [...p, subForm.user_id]);
      api.get("/account/usage").then(setUsage).catch(() => {});
      setSubForm(null);
      setOk("✅ Subscribed! Auto-copy is now active.");
      setTimeout(() => setOk(""), 3000);
    } catch (e) { setSubErr(e.message); }
    finally { setBusy(false); }
  };

  const unsub = async uid => {
    try {
      await api.del(`/copy/unsubscribe/${uid}`);
      setMyIds(p => p.filter(x => x !== uid));
      api.get("/account/usage").then(setUsage).catch(() => {});
    }
    catch (e) { alert(e.message); }
  };

  return (
    <div style={{ padding: 20 }}>
      <OkBox msg={ok} />
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>Discover top signal providers and copy their trades automatically</div>

      {/* Become a provider / my provider profile */}
      {myProvider === null && (
        <Card style={{ background: `linear-gradient(135deg, ${C.gold}14, ${C.surf})`, border: `1px solid ${C.gold}45` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📈 Become a Signal Provider</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {usage && !usage.limits.can_be_provider
                  ? "Requires the Provider Pro plan — generate signals under your own name, build a public track record, earn revenue share from followers."
                  : "Generate signals under your own name, build a public track record, and let other traders copy you automatically."}
              </div>
            </div>
            {usage && !usage.limits.can_be_provider ? (
              <NavLink to="/billing" style={{ textDecoration: "none" }}>
                <Btn col={C.gold}>Upgrade to Provider Pro</Btn>
              </NavLink>
            ) : (
              <Btn col={C.gold} onClick={openRegister}>Become a Provider</Btn>
            )}
          </div>
        </Card>
      )}

      {myProvider && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <SectionTitle>My Provider Profile — {myProvider.display_name}</SectionTitle>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn col={C.green} onClick={() => setSigModal(true)} style={{ padding: "4px 10px", fontSize: 11 }}>+ Create Signal</Btn>
              <Btn col={C.gold} ghost onClick={openRegister} style={{ padding: "4px 10px", fontSize: 11 }}>Edit</Btn>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Badge col={myProvider.subscription_type === "percentage" ? C.purple : C.blue}>
              {myProvider.subscription_type === "percentage" ? `${myProvider.commission_pct}% of profit per trade` : `$${myProvider.monthly_fee}/mo flat`}
            </Badge>
          </div>
          <Grid cols="repeat(4,minmax(0,1fr))" gap={10}>
            <Stat label="Win Rate"   value={`${myProvider.win_rate}%`}   color={C.green} />
            <Stat label="Total Pips" value={`${myProvider.total_pips >= 0 ? "+" : ""}${myProvider.total_pips}`} color={C.blue} />
            <Stat label="Followers" value={myProvider.followers_count}  color={C.purple} />
            <Stat label="Signals"   value={myProvider.total_signals}    color={C.gold} />
          </Grid>
          {myProvider.subscription_type === "monthly" && myProvider.monthly_fee > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
              Est. monthly revenue at ${myProvider.monthly_fee}/follower: <strong style={{ color: C.green }}>
                ${(myProvider.monthly_fee * myProvider.followers_count).toFixed(2)}
              </strong> ({myProvider.followers_count} paying follower{myProvider.followers_count === 1 ? "" : "s"})
            </div>
          )}
          {myProvider.subscription_type === "percentage" && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
              Total earned from performance fees: <strong style={{ color: C.green }}>${myProvider.total_earned_usd?.toFixed(2) || "0.00"}</strong>
            </div>
          )}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 12 }}>
            Create Signal above to place your own trade — copyable signals require you to run the trade yourself;
            closing your position closes it for everyone who copied it too.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn col={C.muted} ghost onClick={() => { setShowFollowers(s => !s); if (!followers) loadFollowers(); }} style={{ fontSize: 11, padding: "6px 12px" }}>
              {showFollowers ? "Hide Followers ▲" : `View Followers (${myProvider.followers_count}) ▼`}
            </Btn>
            <Btn col={C.muted} ghost onClick={() => { setShowEarnings(s => !s); if (!earnings) loadEarnings(); }} style={{ fontSize: 11, padding: "6px 12px" }}>
              {showEarnings ? "Hide Earnings ▲" : "View Earnings ▼"}
            </Btn>
          </div>

          {showEarnings && (
            earnings === null ? (
              <div style={{ fontSize: 12, color: C.muted, padding: "10px 0" }}>Loading…</div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <Grid cols="repeat(3,1fr)" gap={10} style={{ marginBottom: 12 }}>
                  <Stat label="Total Earned" value={`$${earnings.total_earned_usd}`} color={C.green} />
                  <Stat label="Accrued" value={`$${earnings.accrued_usd}`} color={C.gold} />
                  <Stat label="Paid Out" value={`$${earnings.paid_usd}`} color={C.blue} />
                </Grid>
                {earnings.transactions.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>No performance fees earned yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {earnings.transactions.slice(0, 15).map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11,
                                                padding: "7px 10px", background: C.surf2, borderRadius: 6 }}>
                        <span>{t.follower_username} · {t.commission_pct}% of ${t.trade_pnl_usd} profit</span>
                        <strong style={{ color: C.green }}>+${t.amount_usd}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {showFollowers && (
            followers === null ? (
              <div style={{ fontSize: 12, color: C.muted, padding: "10px 0" }}>Loading…</div>
            ) : followers.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muted, padding: "10px 0" }}>No followers yet — share your provider profile to start growing your audience.</div>
            ) : (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {followers.map(f => (
                  <div key={f.follower_id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
                                                      border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <strong>{f.username}</strong>
                    <Badge col={C.muted}>{f.plan}</Badge>
                    <Badge col={f.auto_copy ? C.green : C.gold}>{f.auto_copy ? "Auto" : "Manual"}</Badge>
                    <span style={{ color: C.muted, fontSize: 11 }}>Min conf {f.min_confidence}% · Risk {f.risk_pct}% · Max lot {f.max_lot}</span>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, fontSize: 11 }}>
                      <span style={{ color: C.muted }}>{f.trades_copied} trades · ${f.amount_invested_usd} invested</span>
                      <span style={{ color: f.pnl_from_your_signals >= 0 ? C.green : C.red, fontWeight: 700 }}>
                        {f.pnl_from_your_signals >= 0 ? "+" : ""}${f.pnl_from_your_signals}
                      </span>
                      {myProvider.subscription_type === "percentage" && (
                        <span style={{ color: C.gold, fontWeight: 700 }}>${f.fees_earned_from_follower_usd} earned</span>
                      )}
                      <Btn col={C.red} ghost onClick={() => { if (confirm(`Remove ${f.username} as a follower?`)) removeFollower(f.follower_id); }}
                           style={{ padding: "3px 9px", fontSize: 10 }}>Remove</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </Card>
      )}

      {/* Register / edit provider modal */}
      {regModal && (
        <Modal onClose={() => setRegModal(false)}>
          <SectionTitle>{myProvider ? "Edit Provider Profile" : "Become a Provider"}</SectionTitle>
          <FG label="Display name"><Inp value={regForm.display_name} onChange={e => setRegForm(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Brian FX Signals" /></FG>
          <FG label="Description"><Inp value={regForm.description} onChange={e => setRegForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your trading style / strategy" /></FG>

          <FG label="Revenue model">
            <Sel value={regForm.subscription_type} onChange={e => setRegForm(p => ({ ...p, subscription_type: e.target.value }))}
                 options={[{ v: "monthly", l: "Flat monthly fee" }, { v: "percentage", l: "% of follower profit per trade" }]} />
          </FG>
          {regForm.subscription_type === "monthly" ? (
            <FG label="Monthly subscription fee (USD, 0 = free)"><Inp type="number" min="0" step="1" value={regForm.monthly_fee} onChange={e => setRegForm(p => ({ ...p, monthly_fee: +e.target.value }))} /></FG>
          ) : (
            <>
              <FG label="Commission % of profit (per winning trade, 0-50)"><Inp type="number" min="0" max="50" step="1" value={regForm.commission_pct} onChange={e => setRegForm(p => ({ ...p, commission_pct: +e.target.value }))} /></FG>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                Charged only when a follower's copy of your trade closes in profit — nothing charged on a loss.
                For real MT5 trades, this is tracked and settled from the follower's YobbyForex balance (deposit
                required) since we don't have withdrawal access to their broker account.
              </div>
            </>
          )}

          <FG label="Max signals per day"><Inp type="number" min="1" max="50" value={regForm.max_signals_per_day} onChange={e => setRegForm(p => ({ ...p, max_signals_per_day: +e.target.value }))} /></FG>
          <FG label="Your risk approach (shown to prospective followers)"><Inp value={regForm.risk_notes} onChange={e => setRegForm(p => ({ ...p, risk_notes: e.target.value }))} placeholder="e.g. Max 2% risk per trade, no more than 3 open at once" /></FG>

          <FG label={`Pairs you actually trade (${regForm.preferred_pairs.length === 0 ? "any" : regForm.preferred_pairs.length + " selected"})`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PAIRS.map(pair => {
                const active = regForm.preferred_pairs.includes(pair);
                return (
                  <button key={pair} type="button"
                    onClick={() => setRegForm(p => ({ ...p, preferred_pairs: active ? p.preferred_pairs.filter(x => x !== pair) : [...p.preferred_pairs, pair] }))}
                    style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                             border: `1px solid ${active ? C.gold : C.border}`, background: active ? `${C.gold}20` : "transparent",
                             color: active ? C.gold : C.muted }}>
                    {pair}
                  </button>
                );
              })}
            </div>
          </FG>
          <FG label={`Timeframes you trade (${regForm.preferred_timeframes.length === 0 ? "any" : regForm.preferred_timeframes.length + " selected"})`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["M1","M5","M15","M30","H1","H4","D1","W1"].map(tf => {
                const active = regForm.preferred_timeframes.includes(tf);
                return (
                  <button key={tf} type="button"
                    onClick={() => setRegForm(p => ({ ...p, preferred_timeframes: active ? p.preferred_timeframes.filter(x => x !== tf) : [...p.preferred_timeframes, tf] }))}
                    style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                             border: `1px solid ${active ? C.gold : C.border}`, background: active ? `${C.gold}20` : "transparent",
                             color: active ? C.gold : C.muted }}>
                    {tf}
                  </button>
                );
              })}
            </div>
          </FG>

          <ErrBox msg={regErr} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn col={C.gold} onClick={submitProvider} disabled={regBusy || !regForm.display_name}>
              {regBusy ? "Saving…" : myProvider ? "Save Changes" : "Create Provider Profile"}
            </Btn>
            <Btn col={C.muted} ghost onClick={() => setRegModal(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      <Grid cols="1fr 1fr" gap={16}>
        {/* Provider cards */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <Inp
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search providers by name or pair (e.g. GBPJPY)…"
            />
          </div>
          {list
            .filter(p => {
              const q = query.trim().toUpperCase();
              if (!q) return true;
              const inName = (p.display_name || "").toUpperCase().includes(q) || (p.username || "").toUpperCase().includes(q);
              let prefPairs = [];
              try { prefPairs = JSON.parse(p.preferred_pairs || "[]"); } catch { /* malformed/empty — treat as no preferred pairs */ }
              const inPairs = Array.isArray(prefPairs) && prefPairs.some(pr => String(pr).toUpperCase().includes(q));
              return inName || inPairs;
            })
            .map(p => {
            const following = myIds.includes(p.user_id);
            return (
              <div key={p.id} onClick={() => openDetail(p)} style={{
                background: C.surf, border: `1px solid ${following ? C.gold : C.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10, cursor: "pointer", transition: "border-color .15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {(p.display_name || "??")[0]}{(p.display_name || "??")[1]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.display_name}
                      {p.is_verified && <span style={{ color: C.blue, fontSize: 11 }}>✓</span>}
                      {following && <Badge col={C.gold}>FOLLOWING</Badge>}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.username}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>{(p.description || "").slice(0, 80)}…</div>
                <Grid cols="repeat(4,minmax(0,1fr))" mobileCols="1fr 1fr" gap={12} style={{ textAlign: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 12 }}>
                  {[[`${p.win_rate}%`, "Win Rate", C.green], [`+${p.total_pips}`, "Total Pips", C.blue], [p.followers_count, "Followers", C.purple]].map(([v, l, c]) => (
                    <div key={l}><div style={{ fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 9, color: C.muted }}>{l}</div></div>
                  ))}
                </Grid>
                {following
                  ? <Btn col={C.red} ghost full onClick={e => { e.stopPropagation(); unsub(p.user_id); }}>✗ Unsubscribe</Btn>
                  : usage && usage.limits.max_subscriptions != null && usage.usage.active_subscriptions >= usage.limits.max_subscriptions
                    ? <NavLink to="/billing" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                        <Btn col={C.gold} full>Follow limit reached — Upgrade</Btn>
                      </NavLink>
                    : <Btn col={C.gold} full onClick={e => { e.stopPropagation(); setSubErr(""); setSf({ risk_pct: 2, max_lot: 0.05, min_confidence: 65, auto_copy: true, auto_execute: false, pairs_filter: [] }); setSubForm(p); }}>{p.monthly_fee > 0 ? `Subscribe $${p.monthly_fee}/mo` : "Subscribe Free"}</Btn>}
              </div>
            );
          })}
          {list.length > 0 && query.trim() && !list.some(p => {
            const q = query.trim().toUpperCase();
            const inName = (p.display_name || "").toUpperCase().includes(q) || (p.username || "").toUpperCase().includes(q);
            let prefPairs = [];
            try { prefPairs = JSON.parse(p.preferred_pairs || "[]"); } catch { /* malformed/empty */ }
            return inName || (Array.isArray(prefPairs) && prefPairs.some(pr => String(pr).toUpperCase().includes(q)));
          }) && (
            <div style={{ color: C.muted, fontSize: 12, padding: "16px 4px", textAlign: "center" }}>
              No providers match "{query}"
            </div>
          )}
          {list.length === 0 && (
            <div style={{ color: C.muted, fontSize: 12, padding: "16px 4px", textAlign: "center" }}>
              No providers yet — be the first to become one above.
            </div>
          )}
        </div>

        {/* Provider detail */}
        {detail ? (
          <Card>
            <SectionTitle>{detail.display_name} — Performance</SectionTitle>
            <Grid cols="repeat(4,minmax(0,1fr))"  mobileCols="1fr 1fr" gap={12} style={{ marginBottom: 18 }}>
              <Stat label="Win Rate"    value={`${detail.win_rate}%`}    color={C.green} />
              <Stat label="Total Pips"  value={`+${detail.total_pips}`}  color={C.blue} />
              <Stat label="Monthly"     value={`+${detail.monthly_pips}`} color={C.gold} />
              <Stat label="Avg R:R"     value={`1:${detail.avg_rr}`}     color={C.purple} />
            </Grid>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>{detail.description}</div>
            <SectionTitle>Recent Signals ({detail.recent_signals?.length || 0})</SectionTitle>
            {(detail.recent_signals || []).slice(0, 8).map(s => (
              <Row key={s.id} onClick={() => setSigDetail(s)}
                   style={mobile
                     ? { cursor: "pointer" }
                     : { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                {mobile ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "space-between" }}>
                      <strong>{s.pair}</strong>
                      <Badge col={{ win: C.blue, loss: C.red, breakeven: "#559ebb" }[s.result] || C.muted}>{s.result} {s.pnl_pips}p</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Badge col={s.direction === "BUY" ? C.green : C.red}>{s.direction}</Badge>
                      <Badge col={C.muted}>{s.timeframe}</Badge>
                      <span style={{ fontFamily: "monospace" }}>{fp(s.entry_price)}</span>
                      <span style={{ color: C.gold }}>{s.confidence}%</span>
                      {s.copiers_count > 0 && <span style={{ color: C.muted, fontSize: 11 }}>· {s.copiers_count} copied</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <strong style={{ flex: 1 }}>{s.pair}</strong>
                    <Badge col={s.direction === "BUY" ? C.green : C.red}>{s.direction}</Badge>
                    <Badge col={C.muted}>{s.timeframe}</Badge>
                    <span style={{ fontFamily: "monospace" }}>{fp(s.entry_price)}</span>
                    <Badge col={{ win: C.blue, loss: C.red, breakeven: "#559ebb" }[s.result] || C.muted}>{s.result} {s.pnl_pips}p</Badge>
                    <span style={{ color: C.gold }}>{s.confidence}%</span>
                    <Badge col={{ STRONG: C.green, MODERATE: C.gold, WEAK: "#f97316" }[s.strength] || C.muted}>{s.strength}</Badge>
                    {s.copiers_count > 0 && <span style={{ color: C.muted, fontSize: 11 }}>{s.copiers_count} copied</span>}
                  </>
                )}
              </Row>
            ))}

            {sigDetail && (
              <Card style={{ marginTop: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{sigDetail.pair}</strong>
                    <Badge col={sigDetail.direction === "BUY" ? C.green : C.red}>{sigDetail.direction}</Badge>
                    <Badge col={C.muted}>{sigDetail.timeframe}</Badge>
                  </div>
                  <button onClick={() => setSigDetail(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>×</button>
                </div>
                <Grid cols="repeat(3,minmax(0,1fr))" mobileCols="1fr 1fr 1fr" gap={8} style={{ marginBottom: 12 }}>
                  <Stat label="Entry" value={fp(sigDetail.entry_price)} />
                  <Stat label="Stop Loss" value={fp(sigDetail.stop_loss)} color={C.red} />
                  <Stat label="Take Profit" value={fp(sigDetail.take_profit)} color={C.green} />
                </Grid>
                {/* "people copied" — count + how it went for them in aggregate, not who they are */}
                <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
                  {sigDetail.copiers_count > 0 ? (
                    <>
                      <strong>{sigDetail.copiers_count}</strong> follower{sigDetail.copiers_count === 1 ? "" : "s"} copied this signal
                      {sigDetail.copiers_still_open > 0 && <> · <span style={{ color: C.gold }}>{sigDetail.copiers_still_open} still open</span></>}
                      {(sigDetail.copiers_wins > 0 || sigDetail.copiers_losses > 0) && (
                        <> · <span style={{ color: C.green }}>{sigDetail.copiers_wins} won</span> / <span style={{ color: C.red }}>{sigDetail.copiers_losses} lost</span></>
                      )}
                      {sigDetail.copiers_avg_pips != null && (
                        <> · avg <span style={{ color: sigDetail.copiers_avg_pips >= 0 ? C.green : C.red, fontWeight: 700 }}>
                          {sigDetail.copiers_avg_pips >= 0 ? "+" : ""}{sigDetail.copiers_avg_pips}p</span></>
                      )}
                    </>
                  ) : (
                    <span style={{ color: C.muted }}>No followers had this signal copy to them.</span>
                  )}
                </div>
                {sigDetail.ohlcv?.length > 0 && (
                  <CandleChart1
                    bars={sigDetail.ohlcv}
                    resetKey={`prov_sig_${sigDetail.id}`}
                    pair={sigDetail.pair}
                    timeframe={sigDetail.timeframe}
                    height={mobile ? 260 : 380}
                    entry={sigDetail.entry_price} sl={sigDetail.stop_loss} tp={sigDetail.take_profit}
                    markers={sigDetail.markers || []}
                    supportResistance={sigDetail.support_resistance || []}
                    trendline={sigDetail.trendline}
                    enableDrawing={false}
                  />
                )}
              </Card>
            )}
          </Card>
        ) : (
          <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12, padding: 20 }}>
              Tap a provider on the left to see their win rate, pip history, and recent signals here.
            </div>
          </Card>
        )}
      </Grid>

      {/* Subscribe modal */}
      {subForm && (
        <Modal onClose={() => setSubForm(null)}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Subscribe to {subForm.display_name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Configure how you want to copy this provider's trades</div>
          <FG label="Risk per trade (%)"><Inp type="number" min=".5" max="10" step=".5" value={sf.risk_pct} onChange={e => setSf(p => ({ ...p, risk_pct: +e.target.value }))} /></FG>
          <FG label="Max lot size"><Inp type="number" min=".01" max="1" step=".01" value={sf.max_lot} onChange={e => setSf(p => ({ ...p, max_lot: +e.target.value }))} /></FG>
          <FG label="Min confidence (%)"><Inp type="number" min="50" max="95" value={sf.min_confidence} onChange={e => setSf(p => ({ ...p, min_confidence: +e.target.value }))} /></FG>
          <FG label="Auto copy"><Sel value={sf.auto_copy ? "1" : "0"} onChange={e => setSf(p => ({ ...p, auto_copy: e.target.value === "1" }))} options={[{ v: "1", l: "Yes — Automatic (recommended)" }, { v: "0", l: "No — Manual approve" }]} /></FG>
          <PairsFilterPicker value={sf.pairs_filter} onChange={pf => setSf(p => ({ ...p, pairs_filter: pf }))} />
          {bridgeReady ? (
            <FG label="Execution">
              <Sel value={sf.auto_execute ? "1" : "0"} onChange={e => setSf(p => ({ ...p, auto_execute: e.target.value === "1" }))}
                   options={[{ v: "0", l: "Simulated — in-app only" }, { v: "1", l: "Live — real trades on my MT5 (bridge connected)" }]} />
            </FG>
          ) : (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
              Copies stay simulated in-app. Connect your MT5 bridge in Profile to enable real execution.
            </div>
          )}
          <InfoBox col={C.gold}><div style={{ fontSize: 11, lineHeight: 1.75 }}><strong>Tip for $10–$50 accounts:</strong> Set risk to 1–2% and max lot to 0.01–0.05 on FBS Cent. This limits loss per trade to $0.10–$1.00.</div></InfoBox>
          <ErrBox msg={subErr} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn col={C.gold} onClick={subscribe} disabled={busy}>{busy ? "Subscribing…" : "✓ Subscribe & Copy"}</Btn>
            <Btn col={C.muted} ghost onClick={() => setSubForm(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {/* Create manual signal modal */}
      {sigModal && (
        <Modal onClose={() => setSigModal(false)}>
          <SectionTitle>Create Signal</SectionTitle>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
            This is your own trade — from your own analysis or an external source, not the AI generator. If it's
            copyable, your own position opens right alongside it, and closing your position closes it for everyone
            who copied it.
          </div>
          <Grid cols="1fr 1fr" gap={10}>
            <FG label="Pair"><Sel value={sigForm.pair} onChange={e => setSigForm(p => ({ ...p, pair: e.target.value }))} options={PAIRS} /></FG>
            <FG label="Direction">
              <Sel value={sigForm.direction} onChange={e => setSigForm(p => ({ ...p, direction: e.target.value }))}
                   options={[{ v: "BUY", l: "BUY" }, { v: "SELL", l: "SELL" }]} />
            </FG>
          </Grid>
          <Grid cols="1fr 1fr 1fr" gap={10}>
            <FG label="Entry price"><Inp type="number" step="0.00001" value={sigForm.entry_price} onChange={e => setSigForm(p => ({ ...p, entry_price: e.target.value }))} /></FG>
            <FG label="Stop loss"><Inp type="number" step="0.00001" value={sigForm.stop_loss} onChange={e => setSigForm(p => ({ ...p, stop_loss: e.target.value }))} /></FG>
            <FG label="Take profit"><Inp type="number" step="0.00001" value={sigForm.take_profit} onChange={e => setSigForm(p => ({ ...p, take_profit: e.target.value }))} /></FG>
          </Grid>
          <Grid cols="1fr 1fr" gap={10}>
            <FG label="Your lot size"><Inp type="number" step="0.01" value={sigForm.lot_size} onChange={e => setSigForm(p => ({ ...p, lot_size: e.target.value }))} /></FG>
            <FG label="Timeframe (reference only)">
              <Sel value={sigForm.timeframe} onChange={e => setSigForm(p => ({ ...p, timeframe: e.target.value }))}
                   options={["M1","M5","M15","M30","H1","H4","D1","W1"]} />
            </FG>
          </Grid>

          <FG label="Your analysis / rationale (shown to followers)">
            <Inp value={sigForm.analysis} onChange={e => setSigForm(p => ({ ...p, analysis: e.target.value }))} placeholder="Why you're taking this trade" />
          </FG>

          <FG label="When to place it">
            <Sel value={sigForm.execution_mode} onChange={e => setSigForm(p => ({ ...p, execution_mode: e.target.value }))}
                 options={[{ v: "immediate", l: "Right now — place immediately" }, { v: "pending", l: "Wait for price — set a trigger" }]} />
          </FG>
          {sigForm.execution_mode === "pending" && (
            <FG label="Trigger price (fires once price reaches this)">
              <Inp type="number" step="0.00001" value={sigForm.trigger_price} onChange={e => setSigForm(p => ({ ...p, trigger_price: e.target.value }))} />
            </FG>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={sigForm.is_copyable} onChange={e => setSigForm(p => ({ ...p, is_copyable: e.target.checked }))} />
            Copyable — followers can see and copy this trade
          </label>
          {bridgeReady && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={sigForm.execute_live} onChange={e => setSigForm(p => ({ ...p, execute_live: e.target.checked }))} />
              Place my own side live on MT5 (bridge connected)
            </label>
          )}

          {sigOk && <OkBox msg={sigOk} />}
          <ErrBox msg={sigErr} />
          <Btn col={C.gold} full onClick={submitSignal} disabled={sigBusy || !sigForm.entry_price || !sigForm.stop_loss || !sigForm.take_profit}>
            {sigBusy ? "Saving…" : sigForm.execution_mode === "pending" ? "Save Pending Signal" : "Place Trade Now"}
          </Btn>
        </Modal>
      )}
    </div>
  );
}