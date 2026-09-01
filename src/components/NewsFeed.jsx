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
            <a
              key={n.link || i}
              href={n.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block", textDecoration: "none", color: "inherit",
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
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
