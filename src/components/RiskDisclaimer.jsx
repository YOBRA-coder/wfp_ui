// ─── Risk Disclaimer ────────────────────────────────────────────────────────
// Shown once, blocking, before a new user can use the app. Re-shown if
// risk_disclaimer_accepted_at is ever cleared. This is deliberately thorough —
// copy trading and leveraged forex are genuinely high-risk, and a vague
// one-liner doesn't meet a "well elaborated" bar.
import { useState } from "react";
import { C } from "../utils/constants.jsx";
import { Btn } from "../shared/Shared.jsx";

export default function RiskDisclaimer({ api, onAccepted }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const accept = async () => {
    setBusy(true);
    try { await api.post("/auth/accept-disclaimer", {}); onAccepted(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const onScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14,
        maxWidth: 560, width: "100%", maxHeight: "88dvh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ padding: "18px 22px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.gold }}>⚠ Risk Disclosure — Please Read</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Scroll to the bottom to continue.</div>
        </div>

        <div onScroll={onScroll} style={{ padding: "16px 22px", overflowY: "auto", fontSize: 12.5, lineHeight: 1.75, color: C.text }}>
          <p><strong>Trading forex and CFDs carries a high level of risk and may not be suitable for everyone.</strong> You
          could lose some or all of your invested capital, and losses can happen quickly, including on trades placed
          through copy trading. Never trade or deposit money you cannot afford to lose.</p>

          <p><strong>Leverage amplifies both gains and losses.</strong> A small market move against your position can
          result in a loss larger than your initial deposit if you are trading on margin through your broker.</p>

          <p><strong>Signals and copy trading are not guarantees of profit.</strong> AI-generated signals, provider
          signals, and any "confidence" or "win rate" figures shown in this app are based on historical or simulated
          data and technical analysis. <strong>Past performance is not indicative of future results.</strong> A
          provider's track record — however strong — does not predict what happens to your next copied trade.</p>

          <p><strong>You are responsible for your own trading decisions.</strong> Nothing in this app — signals, AI
          analysis, provider commentary, backtests, or educational content — constitutes financial, investment, or
          legal advice. YobbyForex is not a licensed financial advisor or broker. Consider seeking independent
          financial advice before trading if you are unsure.</p>

          <p><strong>Copy trading has specific additional risks.</strong> When you follow a provider, trades are opened
          in your account (simulated balance or, if MT5-linked, your real broker account) automatically or with your
          approval, based on that provider's decisions — not yours, in the moment. A provider's position closing (or
          a technical failure in signal delivery, your MT5 terminal being offline, or a broker execution delay/slippage)
          can affect your outcome independently of the provider's own result. Percentage-based commission on profitable
          trades is charged to the follower per this app's stated terms, regardless of your subsequent trades.</p>

          <p><strong>Simulated ("demo") balances are not real money</strong> and do not reflect real trading conditions
          such as slippage, requotes, liquidity, or broker execution quality. Strong demo performance does not
          guarantee similar results on a real account.</p>

          <p><strong>Real MT5-linked trading is entirely between you and your broker.</strong> YobbyForex does not
          hold your funds, execute trades as a broker, or guarantee order execution. Your broker's own terms, margin
          rules, and risk disclosures apply in full to any real trade placed through the MT5 bridge.</p>

          <p><strong>Market, technical, and platform risk.</strong> Prices, connectivity, and third-party services
          (data feeds, MT5, brokers, payment providers) can fail or behave unexpectedly. YobbyForex is not liable for
          losses arising from technical failures, data delays, execution errors, or third-party outages.</p>

          <p><strong>Regulatory note.</strong> Depending on your jurisdiction, forex/CFD trading and copy trading may
          be regulated activity. It's your responsibility to ensure your use of this app and any connected broker
          complies with the laws applicable to you.</p>

          <p style={{ color: C.muted, fontSize: 11 }}>By continuing, you confirm you understand and accept these risks,
          that you are trading/investing with money you can afford to lose, and that YobbyForex, its operators, and
          any signal providers on the platform are not liable for your trading losses.</p>
        </div>

        <div style={{ padding: "14px 22px 18px", borderTop: `1px solid ${C.border}` }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, cursor: scrolledToEnd ? "pointer" : "not-allowed", opacity: scrolledToEnd ? 1 : 0.5, marginBottom: 12 }}>
            <input type="checkbox" checked={checked} disabled={!scrolledToEnd}
                   onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 2 }} />
            <span>I have read and understood the risks above, and I accept them. I understand YobbyForex is not
            responsible for my trading losses.</span>
          </label>
          <Btn col={C.gold} full onClick={accept} disabled={!checked || busy}>
            {busy ? "…" : scrolledToEnd ? "Accept & Continue" : "Scroll down to continue"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
