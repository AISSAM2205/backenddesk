// src/components/Admin/TraderLimits.jsx
import React, { useState } from "react";
import { Button } from "antd";
import { useAdmin } from "../../contexts/AdminContext";
import { useToast } from "../Common/Toast";
import { Edit, Save, X, User, AlertTriangle, Shield } from "lucide-react";

/* ─── Semi-circle gauge (same math as PortfolioView) ─────────────── */
const ARC_R = 34;
const ARC_TOTAL = Math.PI * ARC_R;

const ArcGauge = ({ used, limit, color }) => {
  const pct = limit > 0 ? Math.min(used / limit, 1.0) : 0;
  const over = limit > 0 && used > limit;
  const stroke = over ? "var(--loss)" : color;
  const fill = pct * ARC_TOTAL;
  return (
    <svg viewBox="0 0 100 56" style={{ width: 80, flexShrink: 0 }}>
      <path
        d="M 16,50 A 34,34 0 0,1 84,50"
        fill="none"
        stroke="var(--b1)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M 16,50 A 34,34 0 0,1 84,50"
        fill="none"
        stroke={stroke}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${fill.toFixed(2)} ${ARC_TOTAL.toFixed(2)}`}
        style={{
          transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
      <text
        x="50"
        y="37"
        textAnchor="middle"
        fill={stroke}
        fontSize="10"
        fontFamily="JetBrains Mono,monospace"
        fontWeight="600"
      >
        {limit > 0 ? `${Math.round(pct * 100)}%` : "—"}
      </text>
    </svg>
  );
};

/* ─── Format helpers ─────────────────────────────────────────────── */
const fCcy = (v, ccy) => {
  if (!v && v !== 0) return "—";
  const n = parseFloat(v);
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M ${ccy}`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(0)}k ${ccy}`;
  return `${s}${a.toFixed(0)} ${ccy}`;
};

const INSTRUMENTS = [
  { key: "eurobonds", label: "EuroBonds", ccy: "EUR", color: "var(--eb)" },
  { key: "cln_moroc", label: "CLN Maroc", ccy: "USD", color: "var(--cln)" },
  { key: "cln_gcc", label: "CLN GCC", ccy: "USD", color: "var(--cln)" },
  { key: "egp", label: "EGP Bills", ccy: "USD", color: "var(--egp)" },
];

const DEFAULT_LIMITS = {
  eurobonds: { limit: 280000000, currency: "EUR", used: 0 },
  cln_moroc: { limit: 50000000, currency: "USD", used: 0 },
  cln_gcc: { limit: 50000000, currency: "USD", used: 0 },
  egp: { limit: 20000000, currency: "USD", used: 0 },
};

const TraderLimits = () => {
  const { traders, updateTraderLimits } = useAdmin();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const openEdit = (t) => {
    setEditing(t.id);
    setSaveError(null);
    setForm(JSON.parse(JSON.stringify(t.limits || DEFAULT_LIMITS)));
  };
  const cancel = () => {
    setEditing(null);
    setForm({});
    setSaveError(null);
  };

  const setLimitField = (inst, field, value) =>
    setForm((prev) => ({
      ...prev,
      [inst]: { ...prev[inst], [field]: parseFloat(value) || 0 },
    }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateTraderLimits(editing, form);
      toast("Limites sauvegardées avec succès", "success");
      cancel();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur lors de la sauvegarde";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const pct = (used, limit) =>
    limit > 0 ? Math.min((used / limit) * 100, 110) : 0;
  const pctColor = (p) =>
    p >= 95 ? "var(--loss)" : p >= 75 ? "var(--warn)" : "var(--profit)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
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
          Limites Réglementaires
        </h3>
        <p
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.68rem",
            color: "var(--tx3)",
            marginTop: 3,
          }}
        >
          Définissez les plafonds d'exposition par trader et par classe d'actifs
        </p>
      </div>

      {/* Traders cards */}
      {traders.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "48px", color: "var(--tx3)" }}
        >
          <Shield size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem" }}>
            Aucun trader enregistré
          </p>
        </div>
      ) : (
        traders.map((t) => {
          const limits = t.limits || DEFAULT_LIMITS;
          const isEditing = editing === t.id;
          const editLimits = isEditing ? form : limits;
          const traderName = t.firstName
            ? `${t.firstName} ${t.lastName || ""}`
            : t.name || t.username;

          return (
            <div key={t.id} className="card" style={{ overflow: "hidden" }}>
              {/* Trader header */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "var(--surf)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background:
                        "linear-gradient(135deg, rgba(0,202,255,0.15), rgba(30,127,255,0.25))",
                      border: "1px solid var(--b2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--f-disp)",
                      fontWeight: 700,
                      fontSize: "0.80rem",
                      color: "var(--cyan)",
                    }}
                  >
                    {(traderName[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--f-body)",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        color: "var(--tx1)",
                      }}
                    >
                      {traderName}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.60rem",
                        color: "var(--tx3)",
                      }}
                    >
                      {(t.department || t.team || "").replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
                {isEditing ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="small" onClick={cancel} icon={<X size={12} />}>
                        Annuler
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        onClick={save}
                        loading={saving}
                        icon={<Save size={12} />}
                      >
                        Sauvegarder
                      </Button>
                    </div>
                    {saveError && editing === t.id && (
                      <span
                        style={{
                          fontFamily: "var(--f-body)",
                          fontSize: "0.64rem",
                          color: "var(--loss)",
                        }}
                      >
                        {saveError}
                      </span>
                    )}
                  </div>
                ) : (
                  <Button
                    size="small"
                    onClick={() => openEdit(t)}
                    icon={<Edit size={12} />}
                  >
                    Modifier limites
                  </Button>
                )}
              </div>

              {/* Instruments grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 0,
                }}
              >
                {INSTRUMENTS.map((inst, i) => {
                  const d = editLimits[inst.key] || {
                    limit: 0,
                    currency: inst.ccy,
                    used: 0,
                  };
                  const p = pct(d.used, d.limit);
                  const over = p > 100;
                  return (
                    <div
                      key={inst.key}
                      style={{
                        padding: "14px 16px",
                        borderRight: i < 3 ? "1px solid var(--b1)" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 2,
                            background: inst.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontWeight: 700,
                            fontSize: "0.60rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--tx3)",
                          }}
                        >
                          {inst.label}
                        </span>
                        {over && (
                          <AlertTriangle
                            size={11}
                            style={{ color: "var(--loss)", marginLeft: "auto" }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <ArcGauge
                          used={d.used}
                          limit={d.limit}
                          color={inst.color}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 6 }}>
                            <div className="lbl" style={{ marginBottom: 3 }}>
                              Utilisé
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                value={d.used}
                                onChange={(e) =>
                                  setLimitField(
                                    inst.key,
                                    "used",
                                    e.target.value,
                                  )
                                }
                                className="field"
                                style={{
                                  padding: "5px 8px",
                                  fontSize: "0.72rem",
                                  marginBottom: 0,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  fontFamily: "var(--f-mono)",
                                  fontSize: "0.72rem",
                                  color: pctColor(p),
                                  fontWeight: 600,
                                }}
                              >
                                {fCcy(d.used, d.currency)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="lbl" style={{ marginBottom: 3 }}>
                              Limite
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                value={d.limit}
                                onChange={(e) =>
                                  setLimitField(
                                    inst.key,
                                    "limit",
                                    e.target.value,
                                  )
                                }
                                className="field"
                                style={{
                                  padding: "5px 8px",
                                  fontSize: "0.72rem",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  fontFamily: "var(--f-mono)",
                                  fontSize: "0.72rem",
                                  color: "var(--tx2)",
                                  fontWeight: 500,
                                }}
                              >
                                {fCcy(d.limit, d.currency)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress track */}
                      <div style={{ marginTop: 10 }}>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(p, 100)}%`,
                              background: pctColor(p),
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--f-mono)",
                              fontSize: "0.58rem",
                              color: "var(--tx3)",
                            }}
                          >
                            0%
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--f-mono)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                              color: pctColor(p),
                            }}
                          >
                            {p.toFixed(1)}%
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--f-mono)",
                              fontSize: "0.58rem",
                              color: "var(--tx3)",
                            }}
                          >
                            100%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TraderLimits;
