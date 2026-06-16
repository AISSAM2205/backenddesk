// src/components/Reconciliation/ReconciliationView.jsx
//
// Réconciliation Front Office / Back Office — version épurée et professionnelle.
// Confronte le blotter du desk (FO) au jeu Back Office (bo_trade), au niveau TRADE
// et POSITION, avec une barre de réconciliation lisible, l'import du fichier BO et
// un workflow de traitement des écarts.
//
// Robustesse : on appelle le backend (/api/recon) ; s'il n'est pas joignable, l'écran
// se reconstruit à partir des positions déjà chargées (dashboardRows) — même principe
// que le repli synthétique du P&L. L'interface n'est donc JAMAIS vide.

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button, Input, Select } from "antd";
import { useTrading } from "../../contexts/TradingContext";
import { useToast } from "../Common/Toast";
import api from "../../services/api";
import {
  GitCompareArrows,
  Upload,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  Search,
  ShieldAlert,
  Layers,
} from "lucide-react";

const { Option } = Select;

/* ─── Formatters ─────────────────────────────────────────────────── */
const fM = (v) => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  return `${(parseFloat(v) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
};
const fSignedM = (v) => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v);
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "−"}${(Math.abs(n) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} M`;
};
const fPx = (v) =>
  v == null || isNaN(parseFloat(v))
    ? "—"
    : (parseFloat(v) * 100).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fBps = (v) => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v);
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} bp`;
};

/* ─── Styles écart / statut ──────────────────────────────────────── */
const MATCH = {
  MATCHED: { label: "Rapproché", color: "#16C784", bg: "rgba(22,199,132,0.12)", border: "rgba(22,199,132,0.30)" },
  MATCHED_WITH_DIFF: { label: "Écart éco.", color: "#F0B90B", bg: "rgba(240,185,11,0.12)", border: "rgba(240,185,11,0.30)" },
  UNMATCHED_FO: { label: "FO seul", color: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.30)" },
  UNMATCHED_BO: { label: "BO seul", color: "#C084FC", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.30)" },
  BREAK: { label: "Écart", color: "#F6465D", bg: "rgba(246,70,93,0.12)", border: "rgba(246,70,93,0.30)" },
};
const STATUS = {
  OPEN: { label: "Ouvert", color: "#F6465D" },
  INVESTIGATING: { label: "En cours", color: "#F0B90B" },
  RESOLVED: { label: "Résolu", color: "#16C784" },
  ESCALATED: { label: "Escaladé", color: "#C084FC" },
  FALSE_POSITIVE: { label: "Faux positif", color: "var(--tx3)" },
};

const MatchBadge = ({ type }) => {
  const s = MATCH[type] || MATCH.BREAK;
  return (
    <span
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};
const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.OPEN;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--f-mono)", fontSize: "0.58rem", fontWeight: 600, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
};

/* ─── Repli client : reconstruit une réconciliation depuis les positions ─── */
function buildMockRecon(rows) {
  const bonds = (rows || [])
    .filter((r) => r.isin && parseFloat(r.netNominal || 0) > 0)
    .sort((a, b) => parseFloat(a.netNominal || 0) - parseFloat(b.netNominal || 0));

  const trades = [];
  const pos = {};
  const addPos = (isin, desc, ccy, fo, bo) => {
    if (!pos[isin]) pos[isin] = { isin, description: desc, currency: ccy, foNet: 0, boNet: 0 };
    pos[isin].foNet += fo;
    pos[isin].boNet += bo;
  };

  bonds.forEach((r, i) => {
    const isin = r.isin;
    const foNom = parseFloat(r.netNominal || 0);
    const foPx = parseFloat(r.lastWapClean ?? r.cleanPrice ?? 1) || 1;
    let type = "MATCHED", boNom = foNom, boPx = foPx, dNom = 0, dBps = 0, reason = null;
    if (i === 0) { type = "UNMATCHED_FO"; reason = "présent au Front Office, absent du Back Office"; }
    else if (i === 1) { type = "MATCHED_WITH_DIFF"; boPx = foPx + 0.002; dBps = Math.round((foPx - boPx) * 1e6) / 100; reason = "écart prix"; }
    else if (i === 2) { type = "MATCHED_WITH_DIFF"; boNom = foNom + 500000; dNom = foNom - boNom; reason = "écart nominal"; }
    trades.push({
      breakKey: type === "UNMATCHED_FO" ? `MOCK:FO:${isin}` : `MOCK:T:${isin}`,
      matchType: type, isin, description: r.description, way: "BUY",
      foNominal: foNom, foCleanPrice: foPx,
      boNominal: type === "UNMATCHED_FO" ? null : boNom,
      boCleanPrice: type === "UNMATCHED_FO" ? null : boPx,
      deltaNominal: type === "UNMATCHED_FO" ? null : dNom,
      deltaPriceBps: type === "UNMATCHED_FO" ? null : dBps,
      breakReason: reason, status: "OPEN", assignee: null, comment: null,
    });
    addPos(isin, r.description, r.currency, foNom, type === "UNMATCHED_FO" ? 0 : boNom);
  });

  const ghost = "XS2500000002";
  if (bonds.length && !pos[ghost]) {
    trades.push({
      breakKey: `MOCK:BO:${ghost}`, matchType: "UNMATCHED_BO", isin: ghost,
      description: "MOROC (réf. Back Office)", way: "BUY",
      foNominal: null, foCleanPrice: null, boNominal: 5000000, boCleanPrice: 1.0,
      deltaNominal: null, deltaPriceBps: null,
      breakReason: "présent au Back Office, absent du Front Office", status: "OPEN",
    });
    addPos(ghost, "MOROC (réf. Back Office)", "USD", 0, 5000000);
  }

  const positions = Object.values(pos)
    .map((p) => {
      const delta = p.foNet - p.boNet;
      return { ...p, breakKey: `MOCK:P:${p.isin}`, deltaNominal: delta, matchType: Math.abs(delta) < 1 ? "MATCHED" : "BREAK", status: "OPEN" };
    })
    .sort((a, b) => b.foNet - a.foNet);

  return recomputeSummary({ trades, positions }, null);
}

/* Recalcule la synthèse (utilisé par le repli et après traitement local) */
function recomputeSummary(res, prevSummary) {
  const t = res.trades;
  const matched = t.filter((x) => x.matchType === "MATCHED").length;
  const diff = t.filter((x) => x.matchType === "MATCHED_WITH_DIFF").length;
  const unFo = t.filter((x) => x.matchType === "UNMATCHED_FO").length;
  const unBo = t.filter((x) => x.matchType === "UNMATCHED_BO").length;
  const total = t.length || 1;
  const notional = t.reduce((s, x) => {
    if (x.matchType === "MATCHED_WITH_DIFF") return s + Math.abs(x.deltaNominal || 0);
    if (x.matchType === "UNMATCHED_FO") return s + Math.abs(x.foNominal || 0);
    if (x.matchType === "UNMATCHED_BO") return s + Math.abs(x.boNominal || 0);
    return s;
  }, 0);
  const breaks = [...t.filter((x) => x.matchType !== "MATCHED"), ...res.positions.filter((p) => p.matchType === "BREAK")];
  const resolved = breaks.filter((b) => b.status === "RESOLVED" || b.status === "FALSE_POSITIVE").length;
  return {
    ...res,
    summary: {
      runAt: prevSummary?.runAt || new Date().toISOString().slice(0, 19),
      foCount: prevSummary?.foCount ?? t.filter((x) => x.matchType !== "UNMATCHED_BO").length,
      boCount: prevSummary?.boCount ?? t.filter((x) => x.matchType !== "UNMATCHED_FO").length,
      matched, matchedWithDiff: diff, unmatchedFo: unFo, unmatchedBo: unBo,
      positionBreaks: res.positions.filter((p) => p.matchType === "BREAK").length,
      matchRatePct: Math.round((matched * 10000) / total) / 100,
      notionalAtRisk: notional,
      openBreaks: breaks.length - resolved,
      resolvedBreaks: resolved,
    },
  };
}

/* ─── Modal shell ────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, width = 460 }) => (
  <div
    style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)" }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="card" style={{ width, maxWidth: "95vw", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tx1)" }}>
          {title}
        </span>
        <Button type="text" size="small" onClick={onClose} icon={<X size={16} />} style={{ color: "var(--tx3)" }} />
      </div>
      {children}
    </div>
  </div>
);
const Lbl = ({ children }) => (
  <label style={{ display: "block", fontFamily: "var(--f-disp)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 5 }}>
    {children}
  </label>
);
const ErrBox = ({ msg }) =>
  !msg ? null : (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, background: "rgba(246,70,93,0.08)", border: "1px solid rgba(246,70,93,0.22)", marginBottom: 12 }}>
      <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
      <span style={{ fontFamily: "var(--f-body)", fontSize: "0.73rem", color: "var(--loss)" }}>{msg}</span>
    </div>
  );

/* ─── Import BO ──────────────────────────────────────────────────── */
const ImportBoModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.recon.uploadBo(file, "trader");
      setResult(res.data);
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Import impossible (backend requis)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Import fichier Back Office" onClose={onClose}>
      {result ? (
        <div style={{ textAlign: "center", padding: "14px 0" }}>
          <CheckCircle size={32} style={{ color: "var(--profit)", margin: "0 auto 10px" }} />
          <p style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.82rem", color: "var(--profit)" }}>Import réussi</p>
          <p style={{ fontFamily: "var(--f-body)", fontSize: "0.74rem", color: "var(--tx2)", marginTop: 6 }}>
            {result.imported} ligne(s) BO chargée(s){result.errors > 0 ? ` · ${result.errors} en erreur` : ""}
          </p>
          <Button size="small" onClick={onClose} style={{ marginTop: 16 }}>Fermer</Button>
        </div>
      ) : (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            style={{ border: `2px dashed ${file ? "var(--b3)" : "var(--b2)"}`, borderRadius: 10, padding: "24px 18px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: file ? "rgba(0,134,204,0.05)" : "transparent" }}
          >
            <Upload size={22} style={{ color: "var(--tx3)", margin: "0 auto 10px" }} />
            {file ? (
              <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem", color: "var(--cyan)" }}>{file.name}</p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem", color: "var(--tx2)", marginBottom: 4 }}>Glisser-déposer ou cliquer</p>
                <p style={{ fontFamily: "var(--f-mono)", fontSize: "0.6rem", color: "var(--tx3)" }}>
                  ISIN ; sens ; nominal ; prix ; date trade ; date valeur ; contrepartie ; réf BO
                </p>
              </>
            )}
            <input ref={inputRef} type="file" accept=".csv,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </div>
          <p style={{ fontFamily: "var(--f-body)", fontSize: "0.65rem", color: "var(--tx3)", marginBottom: 12, lineHeight: 1.5 }}>
            L'import remplace le jeu Back Office courant (un upload = un arrêté).
          </p>
          <ErrBox msg={error} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button size="small" onClick={onClose}>Annuler</Button>
            <Button type="primary" size="small" onClick={upload} loading={busy} disabled={!file}>Importer</Button>
          </div>
        </>
      )}
    </Modal>
  );
};

/* ─── Investigation ──────────────────────────────────────────────── */
const InvestigationModal = ({ brk, onClose, onSave }) => {
  const [status, setStatus] = useState(brk.status || "OPEN");
  const [assignee, setAssignee] = useState(brk.assignee || "");
  const [comment, setComment] = useState(brk.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ breakKey: brk.breakKey, status, assignee: assignee || null, comment: comment || null });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Mise à jour impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Traitement de l'écart" onClose={onClose}>
      <div style={{ background: "var(--elev)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <MatchBadge type={brk.matchType} />
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.74rem", color: "var(--cyan)" }}>{brk.isin || "—"}</span>
        </div>
        <p style={{ fontFamily: "var(--f-body)", fontSize: "0.7rem", color: "var(--tx2)" }}>{brk.description || "—"}</p>
        {brk.breakReason && <p style={{ fontFamily: "var(--f-body)", fontSize: "0.67rem", color: "var(--warn)", marginTop: 4 }}>Cause : {brk.breakReason}</p>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <Lbl>Statut</Lbl>
        <Select value={status} onChange={setStatus} style={{ width: "100%" }} size="small">
          {Object.keys(STATUS).map((k) => <Option key={k} value={k}>{STATUS[k].label}</Option>)}
        </Select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Lbl>Affecté à</Lbl>
        <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Middle Office / trader" size="small" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <Lbl>Commentaire</Lbl>
        <Input.TextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} placeholder="Analyse, résolution…" />
      </div>
      <ErrBox msg={error} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="small" onClick={onClose}>Annuler</Button>
        <Button type="primary" size="small" onClick={save} loading={busy}>Enregistrer</Button>
      </div>
    </Modal>
  );
};

/* ─── Petite tuile KPI ───────────────────────────────────────────── */
const Tile = ({ label, value, color, icon: Icon }) => (
  <div style={{ flex: "1 1 130px", minWidth: 120, background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 9, padding: "10px 13px", borderLeft: `2px solid ${color}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      {Icon && <Icon size={11} style={{ color }} />}
      <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx3)" }}>{label}</span>
    </div>
    <div style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "1.05rem", color, lineHeight: 1 }}>{value}</div>
  </div>
);

/* ─── Cellules table ─────────────────────────────────────────────── */
const Th = ({ children, align = "right" }) => (
  <th style={{ textAlign: align, padding: "7px 11px", fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.53rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tx3)", borderBottom: "1px solid var(--b1)", position: "sticky", top: 0, background: "var(--base)", whiteSpace: "nowrap" }}>
    {children}
  </th>
);
const Td = ({ children, align = "right", color = "var(--tx2)", mono = true, bold }) => (
  <td style={{ textAlign: align, padding: "6px 11px", fontFamily: mono ? "var(--f-mono)" : "var(--f-body)", fontVariantNumeric: "tabular-nums", fontSize: "0.68rem", fontWeight: bold ? 700 : 500, color, whiteSpace: "nowrap" }}>
    {children}
  </td>
);

/* ═══════════════════════════════════════════════════════════════════ */
const ReconciliationView = () => {
  const { selectedDate, dashboardRows } = useTrading();
  const { toast } = useToast();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("live"); // live | mock
  const [tab, setTab] = useState("trades");
  const [onlyBreaks, setOnlyBreaks] = useState(false);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState(null);

  const runRecon = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.recon.run(selectedDate);
      setResult(res.data);
      setSource("live");
    } catch {
      // Repli : reconstruit la réconciliation depuis les positions déjà chargées
      setResult(buildMockRecon(dashboardRows));
      setSource("mock");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dashboardRows]);

  useEffect(() => {
    runRecon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Repli arrivé trop tôt (positions pas encore chargées) → reconstruire
  useEffect(() => {
    if (source === "mock" && (!result || !result.trades?.length) && dashboardRows?.length) {
      setResult(buildMockRecon(dashboardRows));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardRows]);

  const saveBreak = useCallback(
    async (payload) => {
      if (source === "mock") {
        setResult((prev) => {
          if (!prev) return prev;
          const patch = (o) => (o.breakKey === payload.breakKey ? { ...o, ...payload } : o);
          const next = { trades: prev.trades.map(patch), positions: prev.positions.map(patch) };
          return recomputeSummary(next, prev.summary);
        });
        toast("Écart mis à jour (mode simulé)", "success");
        return;
      }
      await api.recon.updateBreakStatus(payload);
      toast("Écart mis à jour", "success");
      runRecon();
    },
    [source, toast, runRecon],
  );

  const s = result?.summary;
  const rows = tab === "trades" ? result?.trades || [] : result?.positions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const isBrk = tab === "trades" ? r.matchType !== "MATCHED" : r.matchType === "BREAK";
      if (onlyBreaks && !isBrk) return false;
      if (!q) return true;
      return r.isin?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    });
  }, [rows, onlyBreaks, search, tab]);

  // Segments de la barre de réconciliation
  const segs = useMemo(() => {
    if (!s) return [];
    return [
      { key: "MATCHED", n: s.matched, c: MATCH.MATCHED.color },
      { key: "MATCHED_WITH_DIFF", n: s.matchedWithDiff, c: MATCH.MATCHED_WITH_DIFF.color },
      { key: "UNMATCHED_FO", n: s.unmatchedFo, c: MATCH.UNMATCHED_FO.color },
      { key: "UNMATCHED_BO", n: s.unmatchedBo, c: MATCH.UNMATCHED_BO.color },
    ].filter((x) => x.n > 0);
  }, [s]);
  const totalRows = segs.reduce((a, b) => a + b.n, 0) || 1;
  const rate = s?.matchRatePct ?? 0;
  const rateColor = rate >= 95 ? "#16C784" : rate >= 80 ? "#F0B90B" : "#F6465D";

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      {showImport && <ImportBoModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); runRecon(); }} />}
      {selectedBreak && <InvestigationModal brk={selectedBreak} onClose={() => setSelectedBreak(null)} onSave={saveBreak} />}

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--void)", borderBottom: "1px solid var(--b1)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitCompareArrows size={16} style={{ color: "var(--cyan)" }} />
            <h2 className="view-title" style={{ margin: 0 }}>Réconciliation Front / Back Office</h2>
            <span
              style={{
                fontFamily: "var(--f-mono)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "2px 7px", borderRadius: 4,
                color: source === "live" ? "#16C784" : "#F0B90B",
                background: source === "live" ? "rgba(22,199,132,0.10)" : "rgba(240,185,11,0.10)",
                border: `1px solid ${source === "live" ? "rgba(22,199,132,0.28)" : "rgba(240,185,11,0.28)"}`,
              }}
            >
              {source === "live" ? "Données live" : "Simulé"}
            </span>
          </div>
          <p className="view-sub" style={{ paddingLeft: 24 }}>Rapprochement trades & positions · import Back Office · traitement des écarts</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button type="primary" size="small" onClick={() => setShowImport(true)} icon={<Upload size={11} />}>Import BO</Button>
          <Button size="small" loading={loading} onClick={runRecon} icon={<RefreshCw size={11} />} />
        </div>
      </div>

      {/* ── Barre de réconciliation (hero KPI) ── */}
      {s && (
        <div style={{ padding: "14px 16px 6px" }}>
          <div className="card" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--f-disp)", fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 4 }}>
                  Taux de réconciliation
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--f-mono)", fontWeight: 800, fontSize: "2rem", lineHeight: 1, color: rateColor }}>{rate.toFixed(1)}%</span>
                  <span style={{ fontFamily: "var(--f-body)", fontSize: "0.68rem", color: "var(--tx3)" }}>
                    {s.matched}/{totalRows} lignes rapprochées · FO {s.foCount} · BO {s.boCount}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--f-mono)", fontSize: "0.66rem", fontWeight: 700,
                  padding: "4px 10px", borderRadius: 6,
                  color: s.openBreaks === 0 ? "#16C784" : "#F6465D",
                  background: s.openBreaks === 0 ? "rgba(22,199,132,0.10)" : "rgba(246,70,93,0.10)",
                  border: `1px solid ${s.openBreaks === 0 ? "rgba(22,199,132,0.28)" : "rgba(246,70,93,0.28)"}`,
                }}
              >
                {s.openBreaks} écart(s) ouvert(s){s.resolvedBreaks ? ` · ${s.resolvedBreaks} résolu(s)` : ""}
              </span>
            </div>

            {/* Barre segmentée */}
            <div style={{ display: "flex", height: 12, borderRadius: 7, overflow: "hidden", background: "var(--b0)", border: "1px solid var(--b1)" }}>
              {segs.map((seg) => (
                <div key={seg.key} title={`${MATCH[seg.key].label} : ${seg.n}`} style={{ flex: seg.n, background: seg.c, transition: "flex 0.4s ease" }} />
              ))}
            </div>
            {/* Légende */}
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {["MATCHED", "MATCHED_WITH_DIFF", "UNMATCHED_FO", "UNMATCHED_BO"].map((k) => {
                const n = k === "MATCHED" ? s.matched : k === "MATCHED_WITH_DIFF" ? s.matchedWithDiff : k === "UNMATCHED_FO" ? s.unmatchedFo : s.unmatchedBo;
                return (
                  <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: MATCH[k].color }} />
                    <span style={{ fontFamily: "var(--f-body)", fontSize: "0.66rem", color: "var(--tx2)" }}>{MATCH[k].label}</span>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.66rem", fontWeight: 700, color: MATCH[k].color }}>{n}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tuiles KPI ── */}
      {s && (
        <div style={{ display: "flex", gap: 10, padding: "6px 16px 12px", flexWrap: "wrap" }}>
          <Tile label="Notionnel en écart" value={fM(s.notionalAtRisk)} color="#FF7A7A" icon={ShieldAlert} />
          <Tile label="Écarts de position" value={s.positionBreaks} color="#F6465D" icon={Layers} />
          <Tile label="Écarts économiques" value={s.matchedWithDiff} color="#F0B90B" icon={GitCompareArrows} />
          <Tile label="Non rapprochés" value={s.unmatchedFo + s.unmatchedBo} color="#60A5FA" icon={AlertTriangle} />
        </div>
      )}

      {/* ── Contrôles ── */}
      <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--b0)", borderBottom: "1px solid var(--b0)" }}>
        {[{ id: "trades", label: "Trades" }, { id: "positions", label: "Positions" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: "4px 13px", borderRadius: 5, cursor: "pointer", fontFamily: "var(--f-disp)", fontSize: "0.66rem", fontWeight: 700, background: tab === t.id ? "rgba(0,180,255,0.14)" : "transparent", color: tab === t.id ? "var(--cyan)" : "var(--tx3)", border: `1px solid ${tab === t.id ? "rgba(0,180,255,0.30)" : "var(--b1)"}` }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setOnlyBreaks((v) => !v)}
          style={{ padding: "4px 11px", borderRadius: 5, cursor: "pointer", fontFamily: "var(--f-disp)", fontSize: "0.62rem", fontWeight: 700, background: onlyBreaks ? "rgba(246,70,93,0.14)" : "transparent", color: onlyBreaks ? "var(--loss)" : "var(--tx3)", border: `1px solid ${onlyBreaks ? "rgba(246,70,93,0.28)" : "var(--b1)"}` }}
        >
          Écarts seulement
        </button>
        <div style={{ flex: 1 }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ISIN, obligation…" prefix={<Search size={11} style={{ color: "var(--tx3)" }} />} size="small" style={{ width: 220 }} />
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: "auto", padding: "12px 16px 16px" }}>
        <div style={{ border: "1px solid var(--b1)", borderRadius: 8, overflow: "hidden", background: "var(--base)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              {tab === "trades" ? (
                <tr>
                  <Th align="left">Statut</Th>
                  <Th align="left">Instrument</Th>
                  <Th align="center">Sens</Th>
                  <Th>Nominal FO</Th>
                  <Th>Nominal BO</Th>
                  <Th>Prix FO</Th>
                  <Th>Prix BO</Th>
                  <Th>Δ prix</Th>
                  <Th align="left">Workflow</Th>
                  <Th align="center"> </Th>
                </tr>
              ) : (
                <tr>
                  <Th align="left">Statut</Th>
                  <Th align="left">Instrument</Th>
                  <Th align="center">CCY</Th>
                  <Th>Position FO</Th>
                  <Th>Position BO</Th>
                  <Th>Δ nominal</Th>
                  <Th align="left">Workflow</Th>
                  <Th align="center"> </Th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const isBrk = tab === "trades" ? r.matchType !== "MATCHED" : r.matchType === "BREAK";
                const dNom = parseFloat(r.deltaNominal ?? 0);
                const dBps = parseFloat(r.deltaPriceBps ?? 0);
                const Instr = (
                  <Td align="left" mono={false}>
                    <span style={{ fontFamily: "var(--f-mono)", color: "var(--cyan)", fontSize: "0.68rem" }}>{r.isin || "—"}</span>
                    <span style={{ color: "var(--tx3)", marginLeft: 7, fontSize: "0.63rem" }}>{(r.description || "").split(" ").slice(0, 3).join(" ")}</span>
                  </Td>
                );
                const Action = (
                  <Td align="center">
                    {isBrk && (
                      <Button size="small" type="text" onClick={() => setSelectedBreak(r)} style={{ color: "var(--cyan)", fontSize: "0.62rem" }}>Traiter</Button>
                    )}
                  </Td>
                );
                return (
                  <tr key={r.breakKey || idx} style={{ borderBottom: "1px solid var(--b0)", background: isBrk ? "rgba(246,70,93,0.035)" : idx % 2 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                    <Td align="left"><MatchBadge type={r.matchType} /></Td>
                    {Instr}
                    {tab === "trades" ? (
                      <>
                        <Td align="center" color={r.way === "BUY" ? "#60A5FA" : "#FF7A7A"} bold>{r.way || "—"}</Td>
                        <Td color="var(--tx1)">{fM(r.foNominal)}</Td>
                        <Td color="var(--tx1)">{fM(r.boNominal)}</Td>
                        <Td>{fPx(r.foCleanPrice)}</Td>
                        <Td>{fPx(r.boCleanPrice)}</Td>
                        <Td color={dBps === 0 ? "var(--tx3)" : "#F0B90B"} bold={dBps !== 0}>{r.deltaPriceBps != null ? fBps(r.deltaPriceBps) : "—"}</Td>
                      </>
                    ) : (
                      <>
                        <Td align="center" color="var(--tx3)">{r.currency || "—"}</Td>
                        <Td color="var(--tx1)">{fM(r.foNet)}</Td>
                        <Td color="var(--tx1)">{fM(r.boNet)}</Td>
                        <Td color={dNom === 0 ? "var(--tx3)" : "#F6465D"} bold={dNom !== 0}>{fSignedM(r.deltaNominal)}</Td>
                      </>
                    )}
                    <Td align="left"><StatusBadge status={r.status} /></Td>
                    {Action}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && !loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--tx3)", fontFamily: "var(--f-body)", fontSize: "0.76rem" }}>
              {onlyBreaks ? "Aucun écart — tout est rapproché ✓" : "Aucune ligne à afficher."}
            </div>
          )}
        </div>
      </div>

      {loading && !result && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div style={{ width: 28, height: 28, border: "2px solid var(--b1)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ReconciliationView;
