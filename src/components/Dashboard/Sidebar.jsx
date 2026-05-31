import React, { useState, useRef, useEffect } from "react";
import { useTrading } from "../../contexts/TradingContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  BookOpen,
  Shield,
  Coins,
  LogOut,
  Wifi,
  WifiOff,
  Activity,
  FileBarChart,
  ChevronRight,
  AlertTriangle,
  Tag,
  FileText,
} from "lucide-react";

/* ─── Data ──────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Portefeuille",
    items: [
      {
        id: "portfolio",
        label: "Dashboard Global",
        icon: LayoutDashboard,
        accent: "var(--cyan)",
        sub: "P&L · Cockpit · Exposition",
      },
      {
        id: "risk",
        label: "Pricing & Analytics",
        icon: BarChart2,
        accent: "#9B3EEF",
        sub: "Carry · DV01 · Hedge",
      },
    ],
  },
  {
    label: "Marchés",
    items: [
      {
        id: "eurobonds",
        label: "Market Watch",
        icon: TrendingUp,
        accent: "var(--eb)",
        sub: "28 colonnes · Bloomberg",
      },
      {
        id: "futures",
        label: "Futures & Couv.",
        icon: Activity,
        accent: "var(--fut)",
        sub: "Hedge Book · DV01",
      },
      {
        id: "pricing",
        label: "Pricing Screen",
        icon: Tag,
        accent: "#F59E0B",
        sub: "G-Spread · RV · AWB",
      },
    ],
  },
  {
    label: "Instruments",
    items: [
      {
        id: "cln",
        label: "CLN",
        icon: Shield,
        accent: "#9B3EEF",
        sub: "Credit Linked Notes",
      },
      {
        id: "egp",
        label: "EGP Bills",
        icon: Coins,
        accent: "var(--egp)",
        sub: "Bons du Trésor Égypte",
      },
      {
        id: "tbills",
        label: "T-Bills / CP",
        icon: FileText,
        accent: "#10B981",
        sub: "USD · EUR · FX Breakeven",
      },
    ],
  },
  {
    label: "Back-Office",
    items: [
      {
        id: "blotter",
        label: "Trade Blotter",
        icon: BookOpen,
        accent: "var(--profit)",
        sub: "Saisie · Historique",
      },
      {
        id: "reporting",
        label: "Reporting",
        icon: FileBarChart,
        accent: "var(--warn)",
        sub: "PDF · Objectifs · Export",
      },
    ],
  },
];

/* ─── Formatter ─────────────────────────────────────────────── */
const fCompact = (v) => {
  if (v == null) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const a = Math.abs(n),
    s = n >= 0 ? "+" : "−";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)} M`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};

/* ─── NavItem ────────────────────────────────────────────────── */
const NavItem = ({
  id,
  label,
  icon: Icon,
  accent,
  sub,
  isActive,
  badge,
  alertBadge,
  onClick,
}) => {
  const ref = useRef(null);

  const onEnter = () => {
    if (!isActive && ref.current) {
      ref.current.style.background = "rgba(255,255,255,0.032)";
      ref.current.style.borderColor = "rgba(255,255,255,0.05)";
      ref.current.querySelector(".nav-icon").style.background =
        "rgba(255,255,255,0.05)";
      ref.current.querySelector(".nav-label").style.color = "var(--tx1)";
    }
  };
  const onLeave = () => {
    if (!isActive && ref.current) {
      ref.current.style.background = "transparent";
      ref.current.style.borderColor = "transparent";
      ref.current.querySelector(".nav-icon").style.background = "transparent";
      ref.current.querySelector(".nav-label").style.color = "var(--tx2)";
    }
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        padding: "6px 10px 6px 14px",
        borderRadius: 5,
        border: "1px solid",
        borderColor: isActive ? "rgba(255,255,255,0.07)" : "transparent",
        background: isActive
          ? "linear-gradient(90deg, rgba(255,255,255,0.048) 0%, rgba(255,255,255,0.018) 100%)"
          : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 9,
        transition: "background 0.1s, border-color 0.1s",
        outline: "none",
      }}
    >
      {/* Accent bar */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 2,
          height: isActive ? 18 : 0,
          borderRadius: "0 2px 2px 0",
          background: accent,
          transition: "height 0.18s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: isActive ? `0 0 7px ${accent}55` : "none",
        }}
      />

      {/* Icon */}
      <div
        className="nav-icon"
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isActive ? `${accent}18` : "transparent",
          border: `1px solid ${isActive ? `${accent}30` : "transparent"}`,
          transition: "background 0.12s, border-color 0.12s",
        }}
      >
        <Icon
          size={12}
          style={{
            color: isActive ? accent : "var(--tx3)",
            transition: "color 0.12s",
          }}
        />
      </div>

      {/* Label + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="nav-label"
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: isActive ? 600 : 500,
            fontSize: "0.69rem",
            letterSpacing: "0.01em",
            color: isActive && "var(--tx1)",
            lineHeight: 1.25,
            transition: "color 0.1s",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.57rem",
            display: isActive ? "block" : "none",
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </div>
      </div>

      {/* Badges */}
      {alertBadge > 0 ? (
        <span
          style={{
            flexShrink: 0,
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "var(--f-mono)",
            fontSize: "0.54rem",
            fontWeight: 700,
            background: "rgba(255,43,96,0.12)",
            color: "var(--loss)",
            border: "1px solid rgba(255,43,96,0.22)",
            animation: "pulse-live 2s ease infinite",
          }}
        >
          {alertBadge}
        </span>
      ) : badge > 0 ? (
        <span
          style={{
            flexShrink: 0,
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "var(--f-mono)",
            fontSize: "0.54rem",
            fontWeight: 600,
            background: "rgba(255,255,255,0.04)",
            color: "var(--tx3)",
            border: "1px solid var(--b1)",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
};

/* ─── NavGroup ───────────────────────────────────────────────── */
const NavGroup = ({
  group,
  gi,
  isOpen,
  badgeCounts,
  alertCount,
  activeInstrument,
  setActiveInstrument,
  onEnter,
  onLeave,
}) => (
  <div
    style={{
      marginTop: gi === 0 ? 6 : 2,
      paddingTop: gi === 0 ? 0 : 10,
      borderTop: gi === 0 ? "none" : "1px solid var(--b1)",
    }}
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
  >
    {/* Section header — toujours visible, chevron à gauche */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px 6px 8px",
        borderRadius: 6,
        background: isOpen ? "var(--surf)" : "transparent",
        border: "1px solid",
        borderColor: isOpen ? "var(--b1)" : "transparent",
        marginBottom: 2,
        userSelect: "none",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <ChevronRight
        size={12}
        style={{
          color: isOpen ? "var(--cyan)" : "var(--tx3)",
          transform: `rotate(${isOpen ? 90 : 0}deg)`,
          transition: "transform 0.20s cubic-bezier(0.4,0,0.2,1), color 0.15s",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--f-disp)",
          fontWeight: 600,
          fontSize: "0.72rem",
          letterSpacing: "0.01em",
          color: isOpen ? "var(--tx1)" : "var(--tx2)",
          transition: "color 0.15s",
          flex: 1,
        }}
      >
        {group.label}
      </span>
    </div>

    {/* Animated items wrapper */}
    <div
      style={{
        overflow: "hidden",
        maxHeight: isOpen ? "320px" : "0px",
        opacity: isOpen ? 1 : 0,
        transition: [
          "max-height 0.26s cubic-bezier(0.4,0,0.2,1)",
          "opacity 0.20s ease",
        ].join(", "),
        paddingLeft: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          paddingTop: 3,
          paddingBottom: 3,
        }}
      >
        {group.items.map(({ id, label, icon, accent, sub }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            icon={icon}
            accent={accent}
            sub={sub}
            isActive={activeInstrument === id}
            badge={badgeCounts[id]}
            alertBadge={id === "portfolio" ? alertCount : 0}
            onClick={() => setActiveInstrument(id)}
          />
        ))}
      </div>
    </div>
  </div>
);

/* ─── Sidebar ────────────────────────────────────────────────── */
const Sidebar = () => {
  const {
    activeInstrument,
    setActiveInstrument,
    dashboardRows,
    clnList,
    egpList,
    connectionStatus,
    globalDashboard,
  } = useTrading();
  const { user, logout } = useAuth();

  const [hoveredGroup, setHoveredGroup] = useState(null);
  const timerRef = useRef(null);

  /* Always keep the group that contains the active item open */
  const activeGroupIdx = NAV_GROUPS.findIndex((g) =>
    g.items.some((i) => i.id === activeInstrument),
  );

  const isGroupOpen = (gi) => hoveredGroup === gi || activeGroupIdx === gi;

  const handleEnter = (gi) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredGroup(gi);
  };

  const handleLeave = () => {
    timerRef.current = setTimeout(() => setHoveredGroup(null), 140);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  /* Derived data */
  const alertCount = (dashboardRows || []).filter(
    (r) => r.netDailyAlert,
  ).length;
  const pnlEco = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const pnlPos = pnlEco >= 0;
  const pnlStr = fCompact(pnlEco);

  const badgeCounts = {
    portfolio: (dashboardRows || []).length || null,
    eurobonds: (dashboardRows || []).length || null,
    cln: (clnList || []).length || null,
    egp: (egpList || []).length || null,
  };

  const initial = (user?.firstName || user?.username || "T")[0].toUpperCase();
  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.username || "Trader";

  return (
    <aside
      style={{
        width: 228,
        flexShrink: 0,
        background: "var(--base)",
        borderRight: "1px solid var(--b1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* ── Brand ── */}
      <div
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid var(--b1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Monogramme AWB — pas de logo dupliqué, TopBar porte le logo */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              flexShrink: 0,
              background:
                "linear-gradient(135deg, #B5000015 0%, #E8000020 100%)",
              border: "1px solid rgba(229,0,0,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 800,
                fontSize: "0.60rem",
                letterSpacing: "0.04em",
                color: "#E84040",
              }}
            >
              AWB
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.63rem",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--tx1)",
                lineHeight: 1.3,
              }}
            >
              Desk International
            </div>
            <div
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.57rem",
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: 1,
              }}
            >
              Fixed Income
            </div>
          </div>
        </div>
      </div>

      {/* ── P&L Metric ── */}
      <div
        style={{
          margin: "10px 10px 6px",
          padding: "10px 12px",
          borderRadius: 8,
          background: pnlPos
            ? "linear-gradient(135deg, rgba(0,232,153,0.07) 0%, rgba(0,232,153,0.02) 100%)"
            : "linear-gradient(135deg, rgba(255,43,96,0.07) 0%, rgba(255,43,96,0.02) 100%)",
          border: `1px solid ${pnlPos ? "rgba(0,232,153,0.14)" : "rgba(255,43,96,0.14)"}`,
          borderLeft: `2px solid ${pnlPos ? "var(--profit)" : "var(--loss)"}`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.49rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: pnlPos ? "rgba(0,232,153,0.55)" : "rgba(255,43,96,0.55)",
            marginBottom: 5,
          }}
        >
          P&L ÉCONOMIQUE
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontWeight: 700,
              fontSize: pnlStr ? "1.05rem" : "0.90rem",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: pnlPos ? "var(--profit)" : "var(--loss)",
            }}
          >
            {pnlStr || "— "}
          </span>
          <span
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.56rem",
              fontWeight: 600,
              color: "var(--tx3)",
              letterSpacing: "0.04em",
            }}
          >
            MAD
          </span>
        </div>
        {alertCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px solid rgba(255,43,96,0.12)",
            }}
          >
            <AlertTriangle size={9} style={{ color: "var(--loss)" }} />
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontSize: "0.53rem",
                fontWeight: 700,
                color: "var(--loss)",
                letterSpacing: "0.06em",
              }}
            >
              {alertCount} CARRY NÉGATIF
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "4px 8px 8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {NAV_GROUPS.map((group, gi) => (
          <NavGroup
            key={gi}
            group={group}
            gi={gi}
            isOpen={isGroupOpen(gi)}
            badgeCounts={badgeCounts}
            alertCount={alertCount}
            activeInstrument={activeInstrument}
            setActiveInstrument={setActiveInstrument}
            onEnter={() => handleEnter(gi)}
            onLeave={handleLeave}
          />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "10px",
          borderTop: "1px solid var(--b1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* WS status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 9px",
            borderRadius: 6,
            background:
              connectionStatus === "connected"
                ? "rgba(0,232,153,0.04)"
                : "rgba(255,255,255,0.02)",
            border: `1px solid ${
              connectionStatus === "connected"
                ? "rgba(0,232,153,0.13)"
                : "rgba(255,255,255,0.05)"
            }`,
          }}
        >
          {connectionStatus === "connected" ? (
            <>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "var(--profit)",
                  boxShadow: "0 0 5px rgba(0,232,153,0.55)",
                  animation: "pulse-live 2s ease infinite",
                }}
              />
              <Wifi size={10} style={{ color: "var(--profit)" }} />
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.57rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--profit)",
                  flex: 1,
                }}
              >
                WebSocket Live
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "var(--tx3)",
                }}
              />
              <WifiOff size={10} style={{ color: "var(--tx3)" }} />
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.57rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--tx3)",
                  flex: 1,
                }}
              >
                Déconnecté
              </span>
            </>
          )}
        </div>

        {/* User row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              flexShrink: 0,
              background:
                "linear-gradient(135deg, rgba(0,202,255,0.18) 0%, rgba(30,127,255,0.22) 100%)",
              border: "1px solid rgba(0,202,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.74rem",
              color: "rgba(0,202,255,0.9)",
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--f-body)",
                fontWeight: 600,
                fontSize: "0.69rem",
                color: "var(--tx1)",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fullName}
            </div>
            <div
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: "0.54rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color:
                  user?.role === "admin"
                    ? "rgba(155,62,239,0.7)"
                    : "var(--tx3)",
                marginTop: 1,
              }}
            >
              {user?.role === "admin" ? "Administrateur" : "Trader"}
            </div>
          </div>

          <button
            onClick={logout}
            title="Déconnexion"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--tx3)",
              padding: "5px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              transition: "color 0.14s, background 0.14s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--loss)";
              e.currentTarget.style.background = "rgba(255,43,96,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--tx3)";
              e.currentTarget.style.background = "none";
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
