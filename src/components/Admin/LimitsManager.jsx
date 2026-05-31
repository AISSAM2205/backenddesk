// src/components/Admin/LimitsManager.jsx
import React, { useState } from "react";
import { Button } from "antd";
import { useAdmin } from "../../contexts/AdminContext";
import { Edit, Save, X, Target, Shield, TrendingUp } from "lucide-react";

const fM = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)} Md`;
  return `${n.toFixed(0)} M`;
};

const PctBar = ({ pct, color }) => (
  <div
    style={{
      height: 4,
      background: "var(--b1)",
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 4,
    }}
  >
    <div
      style={{
        height: "100%",
        borderRadius: 2,
        transition: "width 0.6s ease",
        width: `${Math.min(pct, 100)}%`,
        background: pct > 90 ? "var(--loss)" : pct > 70 ? "var(--warn)" : color,
      }}
    />
  </div>
);

const LimitsManager = () => {
  const { exposureLimits, annualTargets, updatePortfolioLimit, loading } =
    useAdmin();
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openEdit = (limit) => {
    setEditId(limit.id);
    setForm({
      limitMeur: limit.limitMeur,
      maxDurationYears: limit.maxDurationYears || "",
    });
  };
  const cancel = () => {
    setEditId(null);
    setForm({});
  };

  const save = async () => {
    setSaving(true);
    try {
      const dto = { limitMeur: parseFloat(form.limitMeur) };
      if (form.maxDurationYears !== "")
        dto.maxDurationYears = parseFloat(form.maxDurationYears);
      await updatePortfolioLimit(editId, dto);
      cancel();
    } finally {
      setSaving(false);
    }
  };

  const Section = ({
    title,
    icon: Icon,
    items,
    showDuration = false,
    color,
  }) => (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--surf)",
        }}
      >
        <Icon size={14} style={{ color }} />
        <span
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.70rem",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--tx1)",
          }}
        >
          {title}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--f-mono)",
            fontSize: "0.62rem",
            color: "var(--tx3)",
          }}
        >
          Total :{" "}
          {fM(items.reduce((s, l) => s + parseFloat(l.limitMeur || 0), 0))}{" "}
          {items[0]?.currency || "USD"}
        </span>
      </div>

      {/* Rows */}
      {items.map((l) => {
        const isEditing = editId === l.id;
        const pct = 0; // used amount not tracked at portfolio level
        return (
          <div
            key={l.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderBottom: "1px solid var(--b1)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surf)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {/* Color dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                flexShrink: 0,
                background: l.colorToken?.startsWith("var(")
                  ? undefined
                  : l.colorToken,
                backgroundColor: l.colorToken?.startsWith("var(")
                  ? l.colorToken
                  : undefined,
              }}
            />

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--f-body)",
                  fontWeight: 500,
                  fontSize: "0.74rem",
                  color: "var(--tx1)",
                }}
              >
                {l.portfolioName}
              </div>
              <div
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.60rem",
                  color: "var(--tx3)",
                  marginTop: 2,
                }}
              >
                {l.category} · {l.currency}
              </div>
            </div>

            {/* Limit value */}
            {isEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.58rem",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Montant (M {l.currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.limitMeur}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, limitMeur: e.target.value }))
                    }
                    className="input"
                    style={{
                      width: 100,
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.78rem",
                      padding: "4px 8px",
                    }}
                  />
                </div>
                {showDuration && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <label
                      style={{
                        fontFamily: "var(--f-disp)",
                        fontSize: "0.58rem",
                        color: "var(--tx3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Duration max (ans)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.maxDurationYears}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          maxDurationYears: e.target.value,
                        }))
                      }
                      className="input"
                      style={{
                        width: 90,
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.78rem",
                        padding: "4px 8px",
                      }}
                    />
                  </div>
                )}
                <Button
                  type="primary"
                  size="small"
                  onClick={save}
                  loading={saving}
                  icon={<Save size={12} />}
                  style={{ marginTop: 16 }}
                />
                <Button
                  size="small"
                  onClick={cancel}
                  icon={<X size={12} />}
                  style={{ marginTop: 16 }}
                />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: l.colorToken?.startsWith("var(")
                        ? l.colorToken
                        : l.colorToken,
                    }}
                  >
                    {fM(l.limitMeur)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.60rem",
                      color: "var(--tx3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {l.currency} millions
                  </div>
                  {showDuration && l.maxDurationYears && (
                    <div
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.60rem",
                        color: "var(--tx3)",
                        marginTop: 2,
                      }}
                    >
                      Dur. max {l.maxDurationYears} ans
                    </div>
                  )}
                </div>
                <Button
                  size="small"
                  onClick={() => openEdit(l)}
                  title="Modifier"
                  icon={<Edit size={12} />}
                />
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && (
        <div
          style={{
            padding: "20px 18px",
            fontFamily: "var(--f-body)",
            fontSize: "0.70rem",
            color: "var(--tx3)",
            textAlign: "center",
          }}
        >
          Chargement…
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.80rem",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--tx1)",
          }}
        >
          Objectifs & Limites
        </h3>
        <p
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.68rem",
            color: "var(--tx3)",
            marginTop: 3,
          }}
        >
          Limites réglementaires d'exposition et objectifs annuels de P&amp;L —
          configurables par l'administrateur
        </p>
      </div>

      <Section
        title="Limites d'exposition réglementaires"
        icon={Shield}
        color="var(--cyan)"
        items={exposureLimits}
        showDuration
      />

      <Section
        title="Objectifs annuels de P&L"
        icon={Target}
        color="var(--profit)"
        items={annualTargets}
      />
    </div>
  );
};

export default LimitsManager;
