// ─── Email Verification Landing ─────────────────────────────────────────────
// Reached via the link in the verification email — works regardless of login
// state in THIS browser, since the email might be opened somewhere else.
import { useState, useEffect } from "react";
import { C } from "../utils/constants.jsx";
import { Btn } from "../shared/Shared.jsx";
import { useApi } from "../api/Api.jsx";

export default function VerifyEmailPage() {
  const api = useApi("");
  const [status, setStatus] = useState("checking"); // checking | ok | fail
  const [reason, setReason] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("fail"); setReason("No verification token in this link."); return; }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => {
        if (res.verified) setStatus("ok");
        else { setStatus("fail"); setReason(res.reason || "Invalid link."); }
      })
      .catch(e => { setStatus("fail"); setReason(e.message); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
                  background: C.bg, padding: 20 }}>
      <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32,
                    maxWidth: 400, width: "100%", textAlign: "center" }}>
        {status === "checking" && <div style={{ color: C.muted, fontSize: 13 }}>Verifying…</div>}
        {status === "ok" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.green, marginBottom: 8 }}>Email verified</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>You can close this and go back to the app.</div>
            <a href="/"><Btn col={C.gold} full>Open YobbyForex</Btn></a>
          </>
        )}
        {status === "fail" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 8 }}>Couldn't verify</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{reason}</div>
            <a href="/"><Btn col={C.muted} ghost full>Back to YobbyForex</Btn></a>
          </>
        )}
      </div>
    </div>
  );
}
