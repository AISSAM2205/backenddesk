// src/components/Admin/AdminDashboard.jsx
import { Avatar, Button, Dropdown, Switch } from "antd";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ClipboardList,
  DollarSign,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Target,
  User2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import AuditLogView from "./AuditLogView";
import InstrumentManager from "./InstrumentManager";
import LimitsManager from "./LimitsManager";
import TraderLimits from "./TraderLimits";
import TraderManager from "./TraderManager";

const TABS = [
  {
    id: "traders",
    label: "Gestion Traders",
    icon: Users,
    accent: "var(--cyan)",
  },
  {
    id: "instruments",
    label: "Instruments",
    icon: Briefcase,
    accent: "var(--eb)",
  },
  {
    id: "limits",
    label: "Limites Trading",
    icon: DollarSign,
    accent: "var(--profit)",
  },
  {
    id: "objectives",
    label: "Objectifs & Limites",
    icon: Target,
    accent: "var(--warn)",
  },
  {
    id: "audit",
    label: "Journal d'Audit",
    icon: ClipboardList,
    accent: "var(--cyan)",
  },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("traders");
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { traders, instruments, loading, error, refreshData, clearError } =
    useAdmin();

  const ActiveComponent =
    activeTab === "traders"
      ? TraderManager
      : activeTab === "instruments"
        ? InstrumentManager
        : activeTab === "objectives"
          ? LimitsManager
          : activeTab === "audit"
            ? AuditLogView
            : TraderLimits;

  const initial = (user?.firstName ||
    user?.username ||
    user?.name ||
    "A")[0].toUpperCase();
  const activeAccent =
    TABS.find((t) => t.id === activeTab)?.accent || "var(--cyan)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        color: "var(--tx1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          background: "var(--base)",
          borderBottom: "1px solid var(--b1)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={isDark ? "/attijariwafa-dark.svg" : "/attijariwafa-light.svg"}
            alt=""
            style={{ height: 26, width: "auto", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 800,
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--tx1)",
              }}
            >
              Administration
            </div>
            <div
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.60rem",
                color: "var(--tx3)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Desk International · Fixed Income
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Refresh — next to avatar */}
          <Button
            size="small"
            loading={loading}
            onClick={refreshData}
            icon={<RefreshCw size={11} />}
          />

          {/* User dropdown */}
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            popupRender={() => (
              <div
                style={{
                  width: 248,
                  background: "var(--elev)",
                  border: "1px solid var(--b2)",
                  borderRadius: 12,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.40)",
                  overflow: "hidden",
                }}
              >
                {/* User info */}
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid var(--b1)",
                  }}
                >
                  <Avatar shape="square" icon={<User2 size={16} />}>
                    {initial}
                  </Avatar>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--f-body)",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        color: "var(--tx1)",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user?.firstName
                        ? `${user.firstName} ${user.lastName || ""}`.trim()
                        : user?.name || user?.username || "Administrateur"}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.64rem",
                        color: "var(--tx3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: 2,
                      }}
                    >
                      {user?.email ||
                        `${user?.username || "admin"}@attijariwafa.ma`}
                    </div>
                  </div>
                </div>

                {/* Theme toggle */}
                <div style={{ padding: "4px 0" }}>
                  <button
                    onClick={toggleTheme}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surf)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {isDark ? (
                        <Sun size={14} style={{ color: "#FCD34D" }} />
                      ) : (
                        <Moon size={14} style={{ color: "#60A5FA" }} />
                      )}
                      <span
                        style={{
                          fontFamily: "var(--f-body)",
                          fontSize: "0.78rem",
                          color: "var(--tx1)",
                        }}
                      >
                        {isDark ? "Light Mode" : "Dark Mode"}
                      </span>
                    </div>
                    <Switch
                      size="small"
                      checked={isDark}
                      onChange={toggleTheme}
                      onClick={(_, e) => e.stopPropagation()}
                    />
                  </button>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "var(--b1)",
                    margin: "0 8px",
                  }}
                />

                {/* Logout */}
                <div style={{ padding: "4px 0" }}>
                  <button
                    onClick={logout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,43,96,0.08)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <LogOut size={14} style={{ color: "var(--loss)" }} />
                    <span
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: "0.78rem",
                        color: "var(--loss)",
                        fontWeight: 500,
                      }}
                    >
                      Log out
                    </span>
                  </button>
                </div>
              </div>
            )}
          >
            <Button
              type="text"
              // style={{
              //   display: "flex",
              //   alignItems: "center",
              //   gap: 7,
              //   padding: "4px 8px 4px 4px",
              //   borderRadius: 8,
              //   background: "transparent",
              //   border: "1px solid transparent",
              //   cursor: "pointer",
              //   transition: "all 0.15s",
              // }}
              // onMouseEnter={(e) => {
              //   e.currentTarget.style.background = "var(--surf)";
              //   e.currentTarget.style.borderColor = "var(--b1)";
              // }}
              // onMouseLeave={(e) => {
              //   e.currentTarget.style.background = "transparent";
              //   e.currentTarget.style.borderColor = "transparent";
              // }}
            >
              <Avatar shape="square" icon={<User2 size={16} />}>
                {initial}
              </Avatar>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontFamily: "var(--f-body)",
                    fontWeight: 500,
                    fontSize: "0.72rem",
                    color: "var(--tx1)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.firstName ||
                    user?.name ||
                    user?.username ||
                    "Administrateur"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--f-disp)",
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--tx3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Admin
                </div>
              </div>
              <ChevronDown size={11} style={{ color: "var(--tx3)" }} />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 24px",
            background: "rgba(255,43,96,0.08)",
            borderBottom: "1px solid rgba(255,43,96,0.22)",
          }}
        >
          <AlertTriangle
            size={13}
            style={{ color: "var(--loss)", flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.72rem",
              color: "var(--loss)",
              flex: 1,
            }}
          >
            {error}
          </span>
          <Button
            type="text"
            size="small"
            onClick={clearError}
            icon={<X size={13} />}
            style={{ color: "var(--tx3)" }}
          />
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ padding: "12px 24px 0", display: "flex", gap: 10 }}>
        {[
          {
            label: "Traders actifs",
            value: traders.filter(
              (t) =>
                t.status === "ACTIF" ||
                t.status === "active" ||
                t.isActive === true,
            ).length,
            color: "var(--profit)",
          },
          {
            label: "Total traders",
            value: traders.length,
            color: "var(--cyan)",
          },
          {
            label: "EuroBonds",
            value: instruments.eurobonds?.length || 0,
            color: "var(--eb)",
          },
          {
            label: "CLN",
            value: instruments.cln?.length || 0,
            color: "var(--cln)",
          },
          {
            label: "EGP Bills",
            value: instruments.egp?.length || 0,
            color: "var(--egp)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card slide-up"
            style={{
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontWeight: 700,
                fontSize: "1.25rem",
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </span>
            <span className="lbl" style={{ marginBottom: 0 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Tab navigation ── */}
      <div style={{ padding: "12px 24px 0", display: "flex", gap: 4 }}>
        {TABS.map(({ id, label, icon: Icon, accent }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: "8px 8px 0 0",
                border: "1px solid",
                borderColor: isActive ? "var(--b2)" : "transparent",
                borderBottom: isActive
                  ? "1px solid var(--base)"
                  : "1px solid var(--b1)",
                background: isActive ? "var(--base)" : "transparent",
                cursor: "pointer",
                transition: "all 0.14s",
                marginBottom: isActive ? -1 : 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "var(--surf)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={13}
                style={{ color: isActive ? accent : "var(--tx3)" }}
              />
              <span
                style={{
                  fontFamily: "var(--f-disp)",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--tx1)" : "var(--tx2)",
                }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  style={{
                    width: 30,
                    height: 2,
                    background: accent,
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: 1,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab border line ── */}
      <div
        style={{
          borderBottom: "1px solid var(--b1)",
          marginLeft: 24,
          marginRight: 24,
        }}
      />

      {/* ── Active tab content ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          background: "var(--void)",
        }}
      >
        {loading && !traders.length ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "2px solid var(--b1)",
                borderTopColor: "var(--cyan)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p
              style={{
                fontFamily: "var(--f-disp)",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--tx3)",
              }}
            >
              Chargement…
            </p>
          </div>
        ) : (
          <ActiveComponent />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboard;
