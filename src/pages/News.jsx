// ─── User Guide ───────────────────────────────────────────────────────────────
// A dedicated, in-app reference for how ForexPro actually works — every claim
// here matches real backend/frontend behavior (approval flows, fee models,
// what the wallet is and isn't, etc.), not generic placeholder help text.
import { useMemo, useState } from "react";
import { C } from "../utils/constants.jsx";
import { SectionTitle, useMobile } from "../shared/Shared.jsx";
import { Icon } from "../components/Icons.jsx";
import NewsFeed from "../components/NewsFeed.jsx";
import { useModulePref } from "../utils/modulePrefs.js";



export default function News({ api }) {
  const mobile = useMobile();
  const [query, setQuery] = useState("");
  const [newsFeedEnabled] = useModulePref("news_feed", true);

  return (
    <div style={{ padding: mobile ? 12 : 20, marginBottom: 100, maxWidth: 720, margin: "0 auto" }}>
      <SectionTitle>News ...  <Icon name="market" size={16} /></SectionTitle>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, marginTop: -6 }}>
        Latest from the YobbyFX team and the wider market — every headline links to the original source.
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }}>
          <Icon name="search" size={14} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search the news feed (e.g. "forex", "trading", "copy trading")'
          style={{
            width: "100%", padding: "10px 12px 10px 34px", background: C.surf2,
            border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12.5,
            boxSizing: "border-box",
          }}
        />
      </div>

   {newsFeedEnabled && <NewsFeed api={api} limit={25} />}
    </div>
  );
}
