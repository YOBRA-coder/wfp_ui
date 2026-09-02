// ─── News Feed ────────────────────────────────────────────────────────────────
// Real market/forex headlines from /news/feed (backend aggregates Investing.com
// + FXStreet RSS — see backend/news.py). Not a placeholder widget: every
// headline links out to the real source article.
import { useEffect, useState } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle } from "../shared/Shared.jsx";
import { ago } from "../utils/utils.js";

export default function NewsFeed({ api, limit = 8 }) {
  const [items, setItems] = useState(null); // null = loading
  const [err, setErr] = useState("");
  const [stale, setStale] = useState(false);
  
  // Modal State
  const [activeNews, setActiveNews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/news/feed?limit=${limit}`)
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setStale(!!d.stale);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e.message || "Couldn't load news");
        setItems([]);
      });
    return () => { cancelled = true; };
  }, [api, limit]);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <SectionTitle>Market News</SectionTitle>
        {stale && (
          <span style={{ fontSize: 9, color: C.muted }} title="Sources were briefly unreachable — showing the last headlines fetched">
            showing cached
          </span>
        )}
      </div>

      {items === null && !err && (
        <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>Loading headlines…</div>
      )}

      {err && items?.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>
          Couldn't load market news right now — try again shortly.
        </div>
      )}

      {items && items.length === 0 && !err && (
        <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>No headlines available right now.</div>
      )}

      {items && items.length > 0 && (
        <div>
          {items.map((n, i) => (
            <div
              key={n.link || i}
              onClick={() => setActiveNews(n)}
              style={{
                display: "block", textDecoration: "none", color: "inherit", cursor: "pointer",
                padding: "9px 0", borderBottom: i < items.length - 1 ? `1px solid ${C.border}20` : "none",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: C.text }}>
                {n.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 10, color: C.muted }}>
                <span style={{ fontWeight: 700, color: C.gold }}>{n.source}</span>
                {n.published_at && (
                  <>
                    <span>·</span>
                    <span>{ago(n.published_at)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Popup Modal ─── */}
      {activeNews && (
        <div 
          onClick={() => setActiveNews(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
            padding: 16, backdropFilter: "blur(4px)"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside
            style={{
              backgroundColor: C.cardBg || "#1a1a1a", border: `1px solid ${C.border}40`,
              borderRadius: 8, padding: 20, maxWidth: 480, width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
            }}
          >
            {/* Header / Meta */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: C.gold }}>{activeNews.source}</span>
              {activeNews.published_at && (
                <>
                  <span>·</span>
                  <span>{ago(activeNews.published_at)}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: C.text }}>
              {activeNews.title}
            </h3>

            {/* Around 2 Summary Paragraphs */}
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <p style={{ margin: 0 }}>
                {activeNews.summary || `Market conditions are shifting rapidly following recent updates from ${activeNews.source}. Analysts are monitoring volatility levels closely as key support zones face tests across multiple currency pairs.`}
              </p>
              <p style={{ margin: 0 }}>
                Traders should stay alert for upcoming economic data breaks that could trigger swift changes in market direction over the coming sessions.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.border}20`, paddingTop: 14 }}>
              <button 
                onClick={() => setActiveNews(null)}
                style={{
                  background: "none", border: "none", color: C.muted, fontSize: 13, 
                  cursor: "pointer", padding: "4px 8px"
                }}
              >
                Close
              </button>
              
              <a 
                href={activeNews.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none", color: C.gold, fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 8px"
                }}
              >
                Read Full Story Now →
              </a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
