// ─── Billing / Subscription ────────────────────────────────────────────────────
// Handles the two payment moments the platform needs:
//   • Registration — one-time fee, unlocks full access after signup
//   • Subscription — monthly plan upgrade (M-Pesa STK push or Stripe card)
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Grid, Btn, FG, Inp, ErrBox, OkBox, Badge, Modal, Pill } from "../shared/Shared.jsx";

function money(n, ccy) {
  if (!n) return ccy === "KES" ? "KES 0" : "$0";
  return ccy === "KES" ? `KES ${Number(n).toLocaleString()}` : `$${Number(n).toFixed(2)}`;
}

// ── M-Pesa STK push modal: phone entry -> push -> poll status ──
function MpesaModal({ api, kind, plan, amount, amountUsd, onClose, onSuccess }) {
  const [phone, setPhone]   = useState("");
  const [stage, setStage]   = useState("input"); // input | pushed | success | failed
  const [err, setErr]       = useState("");
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const push = async () => {
    setErr("");
    if (!/^(0|\+?254)?7\d{8}$/.test(phone.replace(/\s/g, ""))) {
      setErr("Enter a valid Safaricom number, e.g. 0712345678");
      return;
    }
    try {
      const res = await api.post("/payments/mpesa/stkpush", { phone, kind, plan, amount_usd: amountUsd });
      setStage("pushed");
      let tries = 0;
      pollRef.current = setInterval(async () => {
        tries += 1;
        try {
          const s = await api.post("/payments/mpesa/status", { checkout_request_id: res.checkout_request_id });
          if (s.status === "success") {
            clearInterval(pollRef.current);
            setStage("success");
            onSuccess && onSuccess();
          } else if (s.status === "failed") {
            clearInterval(pollRef.current);
            setStage("failed");
          }
        } catch { /* keep polling */ }
        if (tries > 40) { clearInterval(pollRef.current); setStage("failed"); }
      }, 3000);
    } catch (e) {
      setErr(e.message || "Could not start M-Pesa payment");
    }
  };

  return (
    <Modal onClose={onClose}>
      <SectionTitle>M-Pesa Payment</SectionTitle>
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        {kind === "registration" ? "One-time registration fee" : kind === "wallet_deposit" ? "Wallet deposit" : `${plan} — monthly subscription`}: <strong style={{ color: C.gold }}>{money(amount, "KES")}</strong>
      </div>

      {stage === "input" && (
        <>
          <FG label="M-Pesa phone number">
            <Inp placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FG>
          <ErrBox msg={err} />
          <Btn col={C.green} full onClick={push}>Send STK Push</Btn>
        </>
      )}

      {stage === "pushed" && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ width: 34, height: 34, margin: "0 auto 14px", border: `3px solid ${C.border}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>Check your phone — enter your M-Pesa PIN to complete payment.</div>
          <div style={{ fontSize: 11, color: C.muted }}>Waiting for confirmation…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {stage === "success" && (
        <>
          <OkBox msg="Payment received! Your access has been updated." />
          <Btn col={C.gold} full onClick={onClose}>Done</Btn>
        </>
      )}

      {stage === "failed" && (
        <>
          <ErrBox msg="Payment wasn't completed — it may have timed out or been cancelled." />
          <Btn col={C.gold} full onClick={() => setStage("input")}>Try Again</Btn>
        </>
      )}
    </Modal>
  );
}

export default function Billing({ api, user, setUser }) {
  const [plans, setPlans]     = useState(null);
  const [ccy, setCcy]         = useState("KES"); // KES (M-Pesa) | USD (card)
  const [modal, setModal]     = useState(null);  // { kind, plan, amount }
  const [busy, setBusy]       = useState("");
  const [err, setErr]         = useState("");
  const [usage, setUsage]     = useState(null);

  useEffect(() => {
    api.get("/payments/plans").then(setPlans).catch((e) => setErr(e.message));
    api.get("/account/usage").then(setUsage).catch(() => {});
  }, [api]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get("/auth/me");
      setUser && setUser(me);
      localStorage.setItem("fpx_u", JSON.stringify(me));
      api.get("/account/usage").then(setUsage).catch(() => {});
    } catch { /* ignore */ }
  }, [api, setUser]);

  const startStripe = async (kind, plan) => {
    setBusy(plan || kind); setErr("");
    try {
      const path = kind === "registration" ? "/payments/checkout/registration" : "/payments/checkout";
      const body = kind === "registration"
        ? { user_id: user.id, user_email: user.email }
        : { plan, user_id: user.id, user_email: user.email };
      const res = await api.post(path, body);
      window.location.href = res.checkout_url;
    } catch (e) {
      setErr(e.message || "Could not start checkout");
    } finally {
      setBusy("");
    }
  };

  const registrationPaid = !!user?.registration_paid;
  const active = user?.subscription_active;

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      {!registrationPaid && (
        <Card style={{
          background: `linear-gradient(135deg, ${C.gold}18, ${C.surf})`,
          border: `1px solid ${C.gold}55`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🔓 Unlock Full Access</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                A one-time registration fee of {plans ? money(plans.registration_fee.kes, "KES") : "…"} ({plans ? money(plans.registration_fee.usd, "USD") : ""}) activates your account.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn col={C.green} onClick={() => setModal({ kind: "registration", plan: null, amount: plans?.registration_fee.kes })}>Pay via M-Pesa</Btn>
              <Btn col={C.gold} ghost onClick={() => startStripe("registration")} disabled={busy === "registration"}>
                {busy === "registration" ? "Redirecting…" : "Pay via Card"}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {usage && (
        <Card>
          <SectionTitle>Your Plan — {usage.plan.replace("_", " ").toUpperCase()}</SectionTitle>
          <Grid cols="repeat(4,1fr)" mobileCols="1fr" gap={10}>
            <UsageStat label="Signals today"
              value={usage.limits.signals_per_day == null ? "Unlimited" : `${usage.usage.signals_today}/${usage.limits.signals_per_day}`}
              full={usage.limits.signals_per_day != null && usage.usage.signals_today >= usage.limits.signals_per_day} />
            <UsageStat label="Manual copies today"
              value={usage.limits.copies_per_day == null ? "Unlimited" : `${usage.usage.copies_today}/${usage.limits.copies_per_day}`}
              full={usage.limits.copies_per_day != null && usage.usage.copies_today >= usage.limits.copies_per_day} />
            <UsageStat label="Providers followed"
              value={usage.limits.max_subscriptions == null ? "Unlimited" : `${usage.usage.active_subscriptions}/${usage.limits.max_subscriptions}`}
              full={usage.limits.max_subscriptions != null && usage.usage.active_subscriptions >= usage.limits.max_subscriptions} />
            <UsageStat label="Become a provider"
              value={usage.is_provider ? "Registered" : usage.limits.can_be_provider ? "Available" : "Requires Provider Pro"}
              full={!usage.limits.can_be_provider && !usage.is_provider} />
          </Grid>
        </Card>
      )}

      <WalletCard api={api} user={user} setUser={setUser} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Subscription Plans</SectionTitle>
          <div style={{ display: "flex", gap: 4 }}>
            <Pill on={ccy === "KES"} onClick={() => setCcy("KES")}>KES · M-Pesa</Pill>
            <Pill on={ccy === "USD"} onClick={() => setCcy("USD")}>USD · Card</Pill>
          </div>
        </div>

        <ErrBox msg={err} />
        {active && user?.plan !== "free" && (
          <OkBox msg={`Your ${user.plan} plan is active${user.subscription_expires_at ? ` until ${String(user.subscription_expires_at).slice(0, 10)}` : ""}.`} />
        )}

        {!plans ? (
          <div style={{ color: C.muted, fontSize: 12 }}>Loading plans…</div>
        ) : (
          <Grid cols="repeat(4,1fr)" mobileCols="1fr" gap={12}>
            {plans.plans.map((p) => {
              const isCurrent = user?.plan === p.id;
              const price = ccy === "KES" ? p.price_kes : p.price_usd;
              return (
                <div key={p.id} style={{
                  background: C.surf2, border: `1px solid ${p.popular ? C.gold : C.border}`,
                  borderRadius: 10, padding: 16, position: "relative", display: "flex", flexDirection: "column",
                }}>
                  {p.popular && (
                    <span style={{ position: "absolute", top: -10, left: 14, background: C.gold, color: C.bg, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>POPULAR</span>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, marginBottom: 2, fontFamily: "monospace" }}>
                    {money(price, ccy)}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>{p.per ? `per ${p.per}` : "forever"}</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", flex: 1 }}>
                    {p.features.map((f) => (
                      <li key={f} style={{ fontSize: 11, color: C.text, marginBottom: 6, display: "flex", gap: 6 }}>
                        <span style={{ color: C.green }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Badge col={C.green}>Current Plan</Badge>
                  ) : p.id === "free" ? (
                    <Btn col={C.muted} ghost full disabled>Free Tier</Btn>
                  ) : ccy === "KES" ? (
                    <Btn col={C.green} full onClick={() => setModal({ kind: "subscription", plan: p.id, amount: p.price_kes })}>
                      {p.cta} via M-Pesa
                    </Btn>
                  ) : (
                    <Btn col={C.gold} full onClick={() => startStripe("subscription", p.id)} disabled={busy === p.id}>
                      {busy === p.id ? "Redirecting…" : `${p.cta} via Card`}
                    </Btn>
                  )}
                </div>
              );
            })}
          </Grid>
        )}
      </Card>

      {modal && (
        <MpesaModal
          api={api}
          kind={modal.kind}
          plan={modal.plan}
          amount={modal.amount}
          onClose={() => setModal(null)}
          onSuccess={refreshUser}
        />
      )}
    </div>
  );
}

function UsageStat({ label, value, full }) {
  return (
    <div style={{ background: C.surf2, border: `1px solid ${full ? C.gold + "55" : C.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: full ? C.gold : C.text }}>{value}</div>
    </div>
  );
}

function WalletCard({ api, user, setUser }) {
  const [wallet, setWallet]   = useState(null);
  const [txs, setTxs]         = useState(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depAmount, setDepAmount] = useState(10);
  const [wdAmount, setWdAmount]   = useState(10);
  const [wdPhone, setWdPhone]     = useState("");
  const [wdBusy, setWdBusy]       = useState(false);
  const [wdErr, setWdErr]         = useState("");
  const [wdOk, setWdOk]           = useState("");

  const load = () => {
    api.get("/wallet/summary").then(setWallet).catch(() => {});
    api.get("/wallet/transactions").then(d => setTxs(d.transactions || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitWithdraw = async () => {
    setWdBusy(true); setWdErr(""); setWdOk("");
    try {
      await api.post("/wallet/withdraw/request", { amount_usd: Number(wdAmount), phone: wdPhone });
      setWdOk("Withdrawal requested — you'll get a notification once it's sent.");
      setShowWithdraw(false);
      load();
      const me = await api.get("/auth/me");
      setUser && setUser(me);
    } catch (e) { setWdErr(e.message); }
    finally { setWdBusy(false); }
  };

  return (
    <Card>
      <SectionTitle>Wallet</SectionTitle>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        This balance funds <strong>simulated copy trades</strong> in the app (including MT5-bridge trades — the app
        reserves/releases margin here for bookkeeping even when the real fill happens on your broker account).
        It is <strong>not</strong> the same as money sitting in your MT5 broker account — that's managed by your
        broker directly (Exness/FBS/etc.) and withdrawn through their own systems, not this app.
      </div>

      <Grid cols="repeat(3,1fr)" mobileCols="1fr" gap={10} style={{ marginBottom: 14 }}>
        <UsageStat label="Wallet balance" value={wallet ? `$${wallet.balance.toFixed(2)}` : "…"} />
        <UsageStat label="Equity (incl. floating P&L)" value={wallet ? `$${wallet.equity.toFixed(2)}` : "…"} />
        <UsageStat label="Pending withdrawals" value={wallet ? `$${wallet.pending_withdrawals_usd.toFixed(2)}` : "…"} full={wallet?.pending_withdrawals_usd > 0} />
      </Grid>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn col={C.green} onClick={() => setShowDeposit(true)}>+ Deposit (M-Pesa)</Btn>
        <Btn col={C.gold} ghost onClick={() => setShowWithdraw(true)}>Request Withdrawal</Btn>
      </div>
      {wdOk && <OkBox msg={wdOk} />}

      {txs && txs.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>RECENT TRANSACTIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {txs.slice(0, 8).map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                        fontSize: 12, padding: "8px 10px", background: C.surf2, borderRadius: 8 }}>
                <span>{t.type === "deposit" ? "⬇" : "⬆"} {t.type === "deposit" ? "Deposit" : "Withdrawal"} · {t.phone}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong style={{ color: t.type === "deposit" ? C.green : C.text }}>
                    {t.type === "deposit" ? "+" : "-"}${t.amount_usd.toFixed(2)}
                  </strong>
                  <Badge col={t.status === "completed" ? C.green : t.status === "rejected" ? C.red : C.gold}>
                    {t.status.toUpperCase()}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {showDeposit && (
        <Modal onClose={() => setShowDeposit(false)}>
          <SectionTitle>Deposit to Wallet</SectionTitle>
          <FG label="Amount (USD)"><Inp type="number" min="1" step="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} /></FG>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>You'll be charged the KES equivalent via M-Pesa STK push.</div>
          <MpesaModalInline api={api} kind="wallet_deposit" amountUsd={Number(depAmount) || 0}
            onClose={() => setShowDeposit(false)} onSuccess={() => { load(); api.get("/auth/me").then(setUser); }} />
        </Modal>
      )}

      {showWithdraw && (
        <Modal onClose={() => setShowWithdraw(false)}>
          <SectionTitle>Request Withdrawal</SectionTitle>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Funds are reserved immediately and paid out manually to your M-Pesa number — this isn't instant.
          </div>
          <FG label="Amount (USD)"><Inp type="number" min="1" step="1" value={wdAmount} onChange={e => setWdAmount(e.target.value)} /></FG>
          <FG label="M-Pesa phone number"><Inp placeholder="0712345678" value={wdPhone} onChange={e => setWdPhone(e.target.value)} /></FG>
          <ErrBox msg={wdErr} />
          <Btn col={C.gold} full onClick={submitWithdraw} disabled={wdBusy}>{wdBusy ? "Submitting…" : "Request Withdrawal"}</Btn>
        </Modal>
      )}
    </Card>
  );
}

// Deposit needs its own trigger (no registration/plan context) — thin wrapper around
// the same M-Pesa STK push + poll flow as MpesaModal, without double-nesting <Modal>.
function MpesaModalInline({ api, kind, amountUsd, onClose, onSuccess }) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("input");
  const [err, setErr]     = useState("");
  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  const push = async () => {
    setErr("");
    if (!/^(0|\+?254)?7\d{8}$/.test(phone.replace(/\s/g, ""))) { setErr("Enter a valid Safaricom number, e.g. 0712345678"); return; }
    if (!amountUsd || amountUsd <= 0) { setErr("Enter a valid amount"); return; }
    try {
      const res = await api.post("/payments/mpesa/stkpush", { phone, kind, amount_usd: amountUsd });
      setStage("pushed");
      let tries = 0;
      pollRef.current = setInterval(async () => {
        tries += 1;
        try {
          const s = await api.post("/payments/mpesa/status", { checkout_request_id: res.checkout_request_id });
          if (s.status === "success") { clearInterval(pollRef.current); setStage("success"); onSuccess && onSuccess(); }
          else if (s.status === "failed") { clearInterval(pollRef.current); setStage("failed"); }
        } catch { /* keep polling */ }
        if (tries > 40) { clearInterval(pollRef.current); setStage("failed"); }
      }, 3000);
    } catch (e) { setErr(e.message || "Could not start M-Pesa payment"); }
  };

  if (stage === "success") return <OkBox msg="Deposit received — your wallet balance is updated." />;
  if (stage === "failed") return (
    <>
      <ErrBox msg="Payment wasn't completed." />
      <Btn col={C.gold} full onClick={() => setStage("input")}>Try Again</Btn>
    </>
  );
  if (stage === "pushed") return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ width: 34, height: 34, margin: "0 auto 14px", border: `3px solid ${C.border}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 12 }}>Check your phone — enter your M-Pesa PIN.</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return (
    <>
      <FG label="M-Pesa phone number"><Inp placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)} /></FG>
      <ErrBox msg={err} />
      <Btn col={C.green} full onClick={push}>Send STK Push</Btn>
    </>
  );
}
