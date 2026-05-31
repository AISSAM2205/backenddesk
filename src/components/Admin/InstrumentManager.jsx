// src/components/Admin/InstrumentManager.jsx
import React, { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import { Plus, Edit, Trash2, Save, X, Briefcase } from "lucide-react";

const CONFIGS = {
  eurobonds: {
    name: "EuroBonds",
    badgeClass: "badge-eb",
    fields: [
      { key: "isin", label: "ISIN", type: "text", required: true },
      {
        key: "description",
        label: "Description",
        type: "text",
        required: true,
      },
      { key: "issuer", label: "Émetteur", type: "text", required: true },
      {
        key: "coupon",
        label: "Coupon %",
        type: "number",
        required: true,
        step: "0.001",
      },
      { key: "maturity", label: "Échéance", type: "date", required: true },
      {
        key: "currency",
        label: "Devise",
        type: "select",
        required: true,
        options: ["EUR", "USD"],
      },
      {
        key: "rating",
        label: "Rating",
        type: "select",
        required: false,
        options: [
          "AAA",
          "AA+",
          "AA",
          "AA-",
          "A+",
          "A",
          "A-",
          "BBB+",
          "BBB",
          "BBB-",
          "BB+",
          "BB",
          "BB-",
          "B+",
          "B",
          "B-",
        ],
      },
    ],
  },
  cln: {
    name: "CLN",
    badgeClass: "badge-cln",
    fields: [
      { key: "id", label: "CLN ID", type: "text", required: true },
      {
        key: "reference",
        label: "Entité référence",
        type: "text",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        required: true,
      },
      {
        key: "region",
        label: "Région",
        type: "select",
        required: true,
        options: ["MOROC", "GCC", "AFRICA", "OTHER"],
      },
      {
        key: "premium",
        label: "Prime %",
        type: "number",
        required: true,
        step: "0.01",
      },
      { key: "spread", label: "Spread bp", type: "number", required: true },
      { key: "maturity", label: "Échéance", type: "date", required: true },
      { key: "issuer", label: "Émetteur", type: "text", required: true },
    ],
  },
  egp: {
    name: "EGP Bills",
    badgeClass: "badge-egp",
    fields: [
      { key: "id", label: "Bill ID", type: "text", required: true },
      { key: "isin", label: "ISIN", type: "text", required: true },
      {
        key: "description",
        label: "Description",
        type: "text",
        required: true,
      },
      {
        key: "yield",
        label: "Rendement %",
        type: "number",
        required: true,
        step: "0.01",
      },
      {
        key: "duration_days",
        label: "Durée (jours)",
        type: "number",
        required: true,
      },
      { key: "maturity", label: "Échéance", type: "date", required: true },
      { key: "issuer", label: "Émetteur", type: "text", required: true },
    ],
  },
};

const TYPE_TABS = [
  { key: "eurobonds", label: "EuroBonds", accent: "var(--eb)" },
  { key: "cln", label: "CLN", accent: "var(--cln)" },
  { key: "egp", label: "EGP Bills", accent: "var(--egp)" },
];

const InstrumentManager = () => {
  const { instruments, createInstrument, updateInstrument, deleteInstrument } =
    useAdmin();
  const [selectedType, setSelectedType] = useState("eurobonds");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const config = CONFIGS[selectedType];
  const list = instruments[selectedType] || [];

  const initForm = () =>
    Object.fromEntries(
      config.fields.map((f) => [f.key, f.type === "number" ? "" : ""]),
    );

  const openAdd = () => {
    setAdding(true);
    setEditing(null);
    setForm(initForm());
  };
  const openEdit = (item) => {
    setEditing(item.id || item.isin);
    setAdding(false);
    setForm({ ...item });
  };
  const cancel = () => {
    setAdding(false);
    setEditing(null);
    setForm({});
  };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      adding
        ? await createInstrument(selectedType, form)
        : await updateInstrument(selectedType, editing, form);
      cancel();
    } finally {
      setSaving(false);
    }
  };

  const del = (item) => {
    const id = item.id || item.isin;
    if (window.confirm(`Supprimer l'instrument ${id} ?`))
      deleteInstrument(selectedType, id);
  };

  const fDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    } catch {
      return d;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
            Référentiel Instruments
          </h3>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.68rem",
              color: "var(--tx3)",
              marginTop: 3,
            }}
          >
            Gérez les instruments par classe d'actifs
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {TYPE_TABS.map(({ key, label, accent }) => {
          const active = selectedType === key;
          const count = (instruments[key] || []).length;
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedType(key);
                cancel();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                border: "1px solid",
                borderColor: active ? accent + "66" : "var(--b1)",
                background: active ? "var(--surf)" : "var(--base)",
                transition: "all 0.14s",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--f-disp)",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: active ? "var(--tx1)" : "var(--tx2)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.60rem",
                  fontWeight: 600,
                  color: active ? accent : "var(--tx3)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: active ? "var(--elev)" : "transparent",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form */}
      {(adding || editing) && (
        <div
          className="card slide-up"
          style={{ padding: "20px", borderColor: "var(--b2)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h4
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.70rem",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--tx1)",
              }}
            >
              {adding ? `Nouveau ${config.name}` : `Modifier ${config.name}`}
            </h4>
            <button
              onClick={cancel}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--tx3)",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {config.fields.map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--f-disp)",
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                  {f.required && (
                    <span style={{ color: "var(--loss)", marginLeft: 3 }}>
                      *
                    </span>
                  )}
                </label>
                {f.type === "select" ? (
                  <select
                    value={form[f.key] || ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="field select"
                    style={{
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                      width: "100%",
                    }}
                  >
                    <option value="">Sélectionner…</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={form[f.key] ?? ""}
                    step={f.step}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="field"
                    style={{ padding: "8px 12px", fontSize: "0.75rem" }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              paddingTop: 14,
              borderTop: "1px solid var(--b1)",
            }}
          >
            <button
              onClick={cancel}
              disabled={saving}
              className="btn btn-ghost btn-sm"
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Save size={12} />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Instruments table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Briefcase
            size={13}
            style={{
              color:
                CONFIGS[selectedType].badgeClass === "badge-eb"
                  ? "var(--eb)"
                  : CONFIGS[selectedType].badgeClass === "badge-cln"
                    ? "var(--cln)"
                    : "var(--egp)",
            }}
          />
          <h4
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.68rem",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--tx1)",
            }}
          >
            {config.name}
          </h4>
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.65rem",
              color: "var(--tx3)",
              padding: "2px 7px",
              background: "var(--elev)",
              borderRadius: 4,
              border: "1px solid var(--b1)",
            }}
          >
            {list.length}
          </span>
        </div>

        {list.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--tx3)",
            }}
          >
            <Briefcase
              size={26}
              style={{ margin: "0 auto 10px", opacity: 0.3 }}
            />
            <p style={{ fontFamily: "var(--f-body)", fontSize: "0.75rem" }}>
              Aucun {config.name.toLowerCase()} enregistré
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dtable">
              <thead>
                <tr>
                  {config.fields.slice(0, 4).map((f) => (
                    <th
                      key={f.key}
                      style={{
                        textAlign: f.type === "number" ? "right" : "left",
                        cursor: "default",
                      }}
                    >
                      {f.label}
                    </th>
                  ))}
                  <th style={{ textAlign: "center", cursor: "default" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background:
                        idx % 2 === 0 ? "var(--tr-even-bg)" : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--tr-hover-bg)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        idx % 2 === 0 ? "var(--tr-even-bg)" : "transparent")
                    }
                  >
                    {config.fields.slice(0, 4).map((f) => (
                      <td
                        key={f.key}
                        style={{
                          textAlign: f.type === "number" ? "right" : "left",
                          fontFamily:
                            f.type === "number"
                              ? "var(--f-mono)"
                              : "var(--f-body)",
                          fontSize: "0.72rem",
                        }}
                      >
                        {f.type === "date"
                          ? fDate(item[f.key])
                          : f.type === "number"
                            ? item[f.key] != null
                              ? `${parseFloat(item[f.key]).toFixed(f.step?.includes("0.0") ? 3 : 0)}${f.key.includes("coupon") || f.key.includes("yield") || f.key.includes("premium") ? "%" : f.key.includes("spread") ? "bp" : ""}`
                              : "—"
                            : item[f.key] || "—"}
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() => openEdit(item)}
                          title="Modifier"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--cyan)",
                            padding: 5,
                            borderRadius: 6,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(0,202,255,0.10)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => del(item)}
                          title="Supprimer"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--tx3)",
                            padding: 5,
                            borderRadius: 6,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(255,43,96,0.10)";
                            e.currentTarget.style.color = "var(--loss)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "none";
                            e.currentTarget.style.color = "var(--tx3)";
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstrumentManager;
