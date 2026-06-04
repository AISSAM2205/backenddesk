import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTrading } from "../../contexts/TradingContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  X,
  Calendar,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "antd";

const fMAD = (v) => {
  if (v == null) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const a = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (a >= 1e9) return `${sign}${(Math.abs(n) / 1e9).toFixed(2)} Md MAD`;
  if (a >= 1e6) return `${sign}${(Math.abs(n) / 1e6).toFixed(2)} M MAD`;
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(n);
};

const useClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
};

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const TopBar = () => {
  const { user } = useAuth();
  const {
    globalDashboard,
    dashboardRows,
    connectionStatus,
    loading,
    refresh,
    lastUpdate,
    selectedDate,
    setDate,
  } = useTrading();
  const { isDark, toggleTheme } = useTheme();
  const [showAlerts, setShowAlerts] = useState(false);
  const clock = useClock();

  const alerts = (dashboardRows || []).filter((r) => r.netDailyAlert);
  const pnlEco = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const pnlPos = pnlEco >= 0;
  const pnlStr = fMAD(pnlEco);
  const timeStr = clock.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const initial = (user?.firstName || user?.username || "T")[0].toUpperCase();

  return (
    <>
      <header
        style={{
          background: "var(--base)",
          borderBottom: "1px solid var(--b1)",
          flexShrink: 0,
          position: "relative",
          zIndex: 40,
        }}
      >
        <div
          style={{
            padding: "0 16px",
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* ── LEFT: Brand + Connection ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexShrink: 0,
            }}
          >
            <img
              src={isDark ? "/attijariwafa-dark.svg" : "/attijariwafa-light.svg"}
              alt="Attijariwafa"
              style={{ height: 22, width: "auto", objectFit: "contain" }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 1, height: 24, background: "var(--b1)" }} />
              <div>
                <div
                  style={{
                    fontFamily: "var(--f-disp)",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--tx1)",
                    lineHeight: 1.2,
                  }}
                >
                  International Trading Desk
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 1,
                  }}
                >
                  {connectionStatus === "connected" ? (
                    <>
                      <span
                        className="live-dot"
                        style={{ width: 5, height: 5 }}
                      />
                      <Wifi size={10} style={{ color: "var(--profit)" }} />
                      <span
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.57rem",
                          fontWeight: 700,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--profit)",
                        }}
                      >
                        Live
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--tx3)",
                        }}
                      />
                      <WifiOff size={10} style={{ color: "var(--tx3)" }} />
                      <span
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.57rem",
                          fontWeight: 700,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--tx3)",
                        }}
                      >
                        Offline
                      </span>
                    </>
                  )}
                  {lastUpdate && (
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.58rem",
                        color: "var(--tx3)",
                      }}
                    >
                      ·{" "}
                      {lastUpdate.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER: P&L + Clock + Date ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {/* Live P&L chip */}
            {pnlStr && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `1px solid ${pnlPos ? "rgba(0,232,153,0.22)" : "rgba(255,43,96,0.22)"}`,
                }}
              >
                <div
                  style={{
                    padding: "4px 8px",
                    background: "var(--elev)",
                    borderRight: `1px solid ${pnlPos ? "rgba(0,232,153,0.22)" : "rgba(255,43,96,0.22)"}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--tx3)",
                    }}
                  >
                    P&L ÉCO
                  </span>
                </div>
                <div
                  style={{
                    padding: "4px 12px",
                    background: pnlPos
                      ? "rgba(0,232,153,0.07)"
                      : "rgba(255,43,96,0.07)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontWeight: 600,
                      fontSize: "0.80rem",
                      letterSpacing: "-0.02em",
                      color: pnlPos ? "var(--profit)" : "var(--loss)",
                    }}
                  >
                    {pnlStr}
                  </span>
                </div>
              </div>
            )}

            {/* Separator */}
            <span style={{ width: 1, height: 22, background: "var(--b1)" }} />

            {/* Clock */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.80rem",
                  color: "var(--tx2)",
                  letterSpacing: "0.04em",
                }}
              >
                {timeStr}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.62rem",
                  color: "var(--tx3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Casablanca
              </span>
            </div>

            {/* Quick-date + Date picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[
                { label: "Auj.", d: 0 },
                { label: "J−1", d: -1 },
                { label: "J−5", d: -5 },
              ].map(({ label, d }) => {
                const target = addDays(d);
                const active = selectedDate === target;
                return (
                  <Button
                    key={label}
                    onClick={() => setDate(target)}
                    size="small"
                    color="primary"
                    type={active ? "primary" : "default"}
                  >
                    {label}
                  </Button>
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--surf)",
                  border: "1px solid var(--b1)",
                  marginLeft: 2,
                  transition: "border-color 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--b2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--b1)")
                }
              >
                <Calendar size={10} style={{ color: "var(--tx3)" }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.68rem",
                    color: "var(--tx1)",
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Actions + User ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {/* Alert bell */}
            <button
              onClick={() => setShowAlerts((v) => !v)}
              style={{
                position: "relative",
                padding: 7,
                borderRadius: 7,
                background:
                  alerts.length > 0 ? "rgba(255,43,96,0.10)" : "transparent",
                border: `1px solid ${alerts.length > 0 ? "rgba(255,43,96,0.22)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.15s",
                color: alerts.length > 0 ? "var(--loss)" : "var(--tx3)",
              }}
              onMouseEnter={(e) => {
                if (!alerts.length) {
                  e.currentTarget.style.background = "var(--surf)";
                  e.currentTarget.style.color = "var(--tx2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!alerts.length) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--tx3)";
                }
              }}
            >
              <Bell size={14} />
              {alerts.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--loss)",
                    color: "white",
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "pulse-live 2s ease infinite",
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Theme toggle */}
            <Button
              size="small"
              onClick={toggleTheme}
              title={isDark ? "Mode clair" : "Mode sombre"}
              icon={
                isDark ? (
                  <Sun size={13} style={{ color: "#FCD34D" }} />
                ) : (
                  <Moon size={13} style={{ color: "#60A5FA" }} />
                )
              }
            />

            {/* Refresh */}
            <Button
              size="small"
              loading={loading}
              onClick={refresh}
              icon={<RefreshCw size={11} />}
            />

            {/* Divider */}
            <span style={{ width: 1, height: 22, background: "var(--b1)" }} />

            {/* User chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "var(--r-xs)",
                  flexShrink: 0,
                  background:
                    "linear-gradient(135deg, rgba(0,202,255,0.16) 0%, rgba(30,127,255,0.22) 100%)",
                  border: "1px solid rgba(0,202,255,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--f-disp)",
                  fontWeight: 700,
                  fontSize: "0.70rem",
                  color: "rgba(0,202,255,0.90)",
                }}
              >
                {initial}
              </div>
              <div className="hidden sm:block">
                <div
                  style={{
                    fontFamily: "var(--f-body)",
                    fontWeight: 500,
                    fontSize: "0.70rem",
                    color: "var(--tx1)",
                    lineHeight: 1.2,
                  }}
                >
                  {user?.firstName || user?.username || "Trader"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--f-disp)",
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--tx3)",
                  }}
                >
                  {user?.department || "Fixed Income"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alert strip ── */}
        {alerts.length > 0 && (
          <div
            style={{
              padding: "6px 16px",
              background: "rgba(255,43,96,0.06)",
              borderTop: "1px solid rgba(255,43,96,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle
              size={12}
              style={{
                color: "var(--loss)",
                flexShrink: 0,
                animation: "pulse-live 2s ease infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontSize: "0.60rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--loss)",
              }}
            >
              {alerts.length} position{alerts.length > 1 ? "s" : ""} — carry
              négatif :
            </span>
            <span
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.72rem",
                color: "#FC8FA0",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {alerts
                .slice(0, 6)
                .map((a) => a.description || a.isin)
                .join(" · ")}
              {alerts.length > 6 && ` +${alerts.length - 6} autres`}
            </span>
          </div>
        )}
      </header>

      {/* ── Alerts Dropdown ── */}
      {showAlerts && (
        <div
          style={{
            position: "absolute",
            right: 16,
            top: alerts.length > 0 ? 76 : 56,
            zIndex: 100,
            width: 320,
            background: "var(--elev)",
            border: "1px solid var(--b2)",
            borderRadius: 12,
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--b1)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.68rem",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--tx1)",
              }}
            >
              Alertes Carry
            </span>
            <button
              onClick={() => setShowAlerts(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--tx3)",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div
            style={{
              padding: 10,
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {alerts.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.75rem",
                  color: "var(--tx3)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Aucune alerte
              </p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.isin}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: "rgba(255,43,96,0.07)",
                    border: "1px solid rgba(255,43,96,0.18)",
                  }}
                >
                  <AlertTriangle
                    size={13}
                    style={{
                      color: "var(--loss)",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--f-body)",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        color: "var(--tx1)",
                        lineHeight: 1.3,
                      }}
                    >
                      {a.description || a.isin}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.68rem",
                        color: "var(--loss)",
                        marginTop: 3,
                      }}
                    >
                      Net Daily:{" "}
                      {new Intl.NumberFormat("fr-MA", {
                        style: "currency",
                        currency: "MAD",
                        maximumFractionDigits: 0,
                      }).format(parseFloat(a.netDailyMad || 0))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default TopBar;
