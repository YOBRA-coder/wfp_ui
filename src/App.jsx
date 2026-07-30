import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useApi } from "./api/Api.jsx";
import { C, NAV, bottomNav, moreNav } from "./utils/constants.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Signals from "./pages/Signals.jsx";
import CopyTrading from "./pages/CopyTrading.jsx";
import Providers from "./pages/Providers.jsx";
import Education from "./pages/Education.jsx";
import Journal from "./pages/Journal.jsx";
import PricesPage from "./pages/PricesPage.jsx";
import Profile from "./pages/Profile.jsx";
import Billing from "./pages/Billing.jsx";
import Notifications from "./pages/Notifications.jsx";
import Settings from "./pages/Settings.jsx";
import Ticker from "./components/Ticker.jsx";
import { Btn } from "./shared/Shared.jsx";
import RiskDisclaimer from "./components/RiskDisclaimer.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("fpx_t") || ""
  );

  const [user, setRawUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fpx_u") || "null");
    } catch {
      return null;
    }
  });

  // Every setUser call in this app now goes through here, so React state and
  // localStorage never drift apart. Previously pages (Profile especially) called
  // the raw setState setter, which updated the UI for that session but silently
  // reverted on next page refresh because localStorage was never touched —
  // that's why saved profile/MT5/plan changes looked like they "didn't save".
  const setUser = useCallback((updater) => {
    setRawUser(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next) localStorage.setItem("fpx_u", JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setRawUser(null);

    localStorage.removeItem("fpx_t");
    localStorage.removeItem("fpx_u");

    window.location.href = "/";
  }, []);

  const api = useApi(token, logout);

  const login = (tok, usr) => {
    setToken(tok);
    setUser(usr);

    localStorage.setItem("fpx_t", tok);
    localStorage.setItem("fpx_u", JSON.stringify(usr));
  };

  // Refresh from the server on load, when the tab regains focus, and every 30s.
  // This is what makes plan upgrades (Billing), balance/equity changes (trading),
  // and provider status show up without the user having to log out and back in.
  // /auth/me also returns a freshly-signed token on every call (sliding session) —
  // as long as the app is used at least once within the 7-day window, the session
  // renews itself instead of hard-expiring and forcing a re-login mid-use.
  useEffect(() => {
    if (!token) return;
    const refresh = () => api.get("/auth/me").then(d => {
      setUser(d);
      if (d.token && d.token !== token) {
        setToken(d.token);
        localStorage.setItem("fpx_t", d.token);
      }
    }).catch(() => {});
    refresh();
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(refresh, 30000);
    return () => { document.removeEventListener("visibilitychange", onVis); clearInterval(iv); };
  }, [token, api]);

  const [moreOpen, setMoreOpen] = useState(false);

  if (window.location.pathname === "/verify-email") return <VerifyEmailPage />;

  if (!token || !user)
    return (
      <>
        <style>{`
          *,*::before,*::after{
            box-sizing:border-box;
            margin:0;
            padding:0
          }

          body{
            background:${C.bg};
            color:${C.text};
            font-family:'Segoe UI',system-ui,sans-serif
          }
        `}</style>

        <AuthPage onLogin={login} />
      </>
    );

  return (
    <BrowserRouter>
      <>
        {!user?.risk_disclaimer_accepted_at && (
          <RiskDisclaimer api={api} onAccepted={() => setUser(u => ({ ...u, risk_disclaimer_accepted_at: new Date().toISOString() }))} />
        )}
        <style>{`
html,
body,
#root{
  height:100%;
  margin:0;
  overflow:hidden;
}

body{
  background:${C.bg};
  color:${C.text};
  font-family:'Segoe UI',system-ui,sans-serif;
  font-size:13px;
  overflow-y:auto;
}

.app{
  display:flex;
  height:100vh;
  height:100dvh; /* dvh accounts for the Android/Chrome address+gesture bar so fixed elements aren't pushed off-screen */
  width:100%;
  overflow:hidden;
}

.main{
 margin-left:194px;
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
  height:100vh;
  height:100dvh;
  overflow:hidden;
}

.content{
   flex:1;
  overflow-y:auto;
  overflow-x:hidden;
  min-width:0;
}

  .sidebar{
  width:194px;
  flex-shrink:0;

  position:fixed;
  top:0;
  left:0;
  bottom:0;

  background:${C.surf};
  border-right:1px solid ${C.border};

  display:flex;
  flex-direction:column;

  overflow-y:auto;
}

          .nav-btn{
            display:flex;
            align-items:center;
            gap:9px;
            padding:9px 14px;
            width:100%;
            border:none;
            text-decoration:none;
            background:transparent;
            color:${C.muted};
            font-size:12px;
            font-weight:500;
            transition:.15s;
          }

          .nav-btn.active{
            background:${C.gold}16;
            color:${C.gold};
          }

          .mobile-nav{
            display:none;
          }

          @media(max-width:768px){

             .sidebar{
    display:none;
  }

  .main{
    margin-left:0;
  }

            .mobile-nav{
              display:flex;
              position:fixed;
              bottom:0;
              left:0;
              right:0;
              height:calc(65px + env(safe-area-inset-bottom, 0px));
              padding-bottom:env(safe-area-inset-bottom, 0px);
              background:${C.surf};
              border-top:1px solid ${C.border};
              z-index:999;
            }

            .mobile-link{
              flex:1;
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:center;
              gap:4px;
              text-decoration:none;
              color:${C.muted};
              font-size:10px;
            }

            .mobile-link.active{
              color:${C.gold};
              background:${C.gold}2;
            }

            .content{
            margin-bottom:calc(65px + env(safe-area-inset-bottom, 0px));
          }
            }

          }
        `}</style>

        <div className="app">

          {/* Sidebar */}
          <aside className="sidebar">

            <div
              style={{
                padding: "15px 14px 11px",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                Forex<span style={{ color: C.gold }}>Pro</span>
              </div>

              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  letterSpacing: 2,
                  marginTop: 2,
                }}
              >
                PROFESSIONAL PLATFORM
              </div>
            </div>

            <nav style={{ padding: "7px 0", flex: 1 }}>
              {NAV.map((n) => (
                <NavLink
                  key={n.id}
                  to={n.id === "dashboard" ? "/" : `/${n.id}`}
                  className={({ isActive }) =>
                    isActive ? "nav-btn active" : "nav-btn"
                  }
                >
                  <span
                    style={{
                      fontSize: 14,
                      width: 18,
                      textAlign: "center",
                    }}
                  >
                    {n.icon}
                  </span>

                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div
              style={{
                padding: "10px 14px",
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: C.gold,
                    color: C.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {user?.username}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                    }}
                  >
                    {user?.plan?.toUpperCase()} · $
                    {Number(user?.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="main">

           

            <div
              style={{
                background: C.surf,
                borderBottom: `1px solid ${C.border}`,
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Forex<span style={{ color: C.gold }}>Pro</span>
                 <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  letterSpacing: 2,
                  marginTop: 2,
                }}
              >
              {window.location.pathname === "/" ? "DASHBOARD" : window.location.pathname.slice(1).toUpperCase()}

              </div>
              
              </div>
             

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <NavLink
                  to="/notifications"
                  style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                           width: 32, height: 32, borderRadius: 8, textDecoration: "none",
                           color: C.text, background: C.surf2, border: `1px solid ${C.border}` }}
                  title="Notifications"
                >
                  🔔
                  {user?.unread_notifications > 0 && (
                    <span style={{
                      position: "absolute", top: -3, right: -3, background: C.red, color: "#fff",
                      fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
                    }}>
                      {user.unread_notifications > 9 ? "9+" : user.unread_notifications}
                    </span>
                  )}
                </NavLink>
                <Btn
                  col={C.surf2}
                  ghost
                  onClick={logout}
                  style={{
                   width: 32, height: 32, borderRadius: 8,display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                   📤
                </Btn>
                 <NavLink to="/profile" style={{cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit"}}>
                  <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: C.gold,
                    color: C.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                 
                  
                </NavLink>
                <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                    }}
                  >
                    $ {Number(user?.balance || 0).toLocaleString()}
                  </div>
              </div>
            </div>
            {!user?.registration_paid && (
              <NavLink to="/billing" style={{ textDecoration: "none" }}>
                <div style={{
                  background: `${C.gold}18`, borderBottom: `1px solid ${C.gold}55`,
                  padding: "7px 20px", fontSize: 11, color: C.gold, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>🔓 Pay your one-time registration fee to unlock full platform access</span>
                  <span style={{ textDecoration: "underline" }}>Pay now →</span>
                </div>
              </NavLink>
            )}
            <div style={{ overflow: "hidden", width: "100%" }}>
  <Ticker api={api} />
</div>

            {/* Pages */}
            <div
              className="content"
              style={{
                overflowY: "auto",
                flex: 1,
              }}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Dashboard api={api} />}
                />

                <Route
                  path="/signals"
                  element={<Signals api={api} />}
                />

                <Route
                  path="/copy"
                  element={<CopyTrading api={api} />}
                />

                <Route
                  path="/providers"
                  element={<Providers api={api} />}
                />

                <Route
                  path="/education"
                  element={<Education api={api} />}
                />

                <Route
                  path="/journal"
                  element={<Journal api={api} />}
                />

                <Route
                  path="/prices"
                  element={<PricesPage api={api} />}
                />

                <Route
                  path="/billing"
                  element={
                    <Billing
                      api={api}
                      user={user}
                      setUser={setUser}
                    />
                  }
                />

                <Route
                  path="/notifications"
                  element={<Notifications api={api} onRead={() => api.get("/auth/me").then(setUser).catch(() => {})} />}
                />

                <Route
                  path="/settings"
                  element={<Settings api={api} user={user} setUser={setUser} />}
                />

                <Route
                  path="/profile"
                  element={
                    <Profile
                      api={api}
                      user={user}
                      setUser={setUser}
                    />
                  }
                />
              </Routes>
            </div>
          </div>

          {/* Bottom Android Nav */}
          <div className="mobile-nav">
            {bottomNav.map((n) => (
              <NavLink
                key={n.id}
                to={n.id === "dashboard" ? "/" : `/${n.id}`}
                className={({ isActive }) =>
                  isActive
                    ? "mobile-link active"
                    : "mobile-link"
                }
              >
                <span style={{ fontSize: 18 }}>
                  {n.icon}
                </span>

                <span>{n.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setMoreOpen(true)}
              className="mobile-link"
              style={{ background: "none", border: "none", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: 18 }}>☰</span>
              <span>More</span>
            </button>
          </div>

          {moreOpen && (
            <div
              onClick={() => setMoreOpen(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
                display: "flex", alignItems: "flex-end",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: C.surf, width: "100%", borderTop: `1px solid ${C.border}`,
                  borderTopLeftRadius: 16, borderTopRightRadius: 16,
                  paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
                  maxHeight: "70vh", overflowY: "auto",
                }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: "10px auto" }} />
                {moreNav.map((n) => (
                  <NavLink
                    key={n.id}
                    to={`/${n.id}`}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "13px 20px", textDecoration: "none", color: C.text, fontSize: 14,
                    }}
                  >
                    <span style={{ fontSize: 17, width: 22, textAlign: "center" }}>{n.icon}</span>
                    {n.label}
                    {n.id === "notifications" && user?.unread_notifications > 0 && (
                      <span style={{
                        marginLeft: "auto", background: C.red, color: "#fff", fontSize: 10, fontWeight: 700,
                        borderRadius: 999, minWidth: 18, height: 18, display: "flex", alignItems: "center",
                        justifyContent: "center", padding: "0 5px",
                      }}>
                        {user.unread_notifications > 9 ? "9+" : user.unread_notifications}
                      </span>
                    )}
                  </NavLink>
                ))}
                <div style={{ padding: "8px 20px 0" }}>
                  <Btn col={C.muted} ghost full onClick={() => { setMoreOpen(false); logout(); }}>Sign Out</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </BrowserRouter>
  );
}