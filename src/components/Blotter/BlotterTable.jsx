import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button, Input, Select as AntSelect } from "antd";
const { Option } = AntSelect;
import * as XLSX from "xlsx";
import api from "../../services/api";
import {
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  TrendingUp,
  Activity,
  Upload,
  CheckCircle,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN = (v, d = 2) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
// Prix stockés en fraction décimale Bloomberg (1.0275 = 102.75 % du pair)
const fPx = (v, d = 4) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return fN(n * 100, d);
};
const today = () => new Date().toISOString().split("T")[0];
const pnlColor = (v) =>
  parseFloat(v || 0) >= 0 ? "var(--profit)" : "var(--loss)";

/* P&L par ligne de blotter : P&L réalisé si le trade est clôturé (gain/perte
   cristallisé sur un SELL), sinon P&L latent (MtM) = valorisation marché de la
   position ouverte. Garantit une colonne toujours renseignée et pertinente,
   comme sur un vrai blotter de salle. */
const linePnl = (t) => {
  const r = t.realizedPnl != null ? parseFloat(t.realizedPnl) : null;
  const m = t.mtmPnl != null ? parseFloat(t.mtmPnl) : null;
  if (t.isClosed && r != null && r !== 0) return r;
  if (m != null && !isNaN(m)) return m;
  return r != null && !isNaN(r) ? r : null;
};

/* ─── Badges ─────────────────────────────────────────────────────── */
const WayBadge = ({ way }) => {
  const w = (way || "").toUpperCase();
  if (w === "BUY")
    return (
      <span
        className="badge badge-buy"
        style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        <ArrowUpRight size={9} />
        BUY
      </span>
    );
  if (w === "SELL")
    return (
      <span
        className="badge badge-sell"
        style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        <ArrowDownRight size={9} />
        SELL
      </span>
    );
  return <span className="badge badge-closed">{way || "—"}</span>;
};

const SubBadge = ({ sub }) => {
  if (!sub) return null;
  const s = sub.toLowerCase();
  const cls = s.includes("future")
    ? "badge-fut"
    : s.includes("cln")
      ? "badge-cln"
      : s.includes("egp") || s.includes("bill")
        ? "badge-egp"
        : "badge-eb";
  return <span className={`badge ${cls}`}>{sub}</span>;
};

const StatusBadge = ({ isClosed }) =>
  isClosed ? (
    <span className="badge badge-closed">Annulé</span>
  ) : (
    <span className="badge badge-active">Actif</span>
  );

const TRADE_CAT_STYLES = {
  TRADING: { label: "Trading", bg: "rgba(30,127,255,0.14)", color: "#60A5FA" },
  MARKET_MAKING: {
    label: "Mkt Mkg",
    bg: "rgba(155,62,239,0.14)",
    color: "#C084FC",
  },
  MONTAGE: {
    label: "Montage",
    bg: "rgba(251,146,60,0.14)",
    color: "#FB923C",
  },
};
const TradeCatBadge = ({ cat }) => {
  const c = TRADE_CAT_STYLES[cat];
  if (!c)
    return (
      <span style={{ color: "var(--tx3)", fontSize: "0.62rem" }}>—</span>
    );
  return (
    <span
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.58rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: c.bg,
        color: c.color,
        borderRadius: 3,
        padding: "2px 5px",
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
};

/* ─── Reusable Modal Shell ───────────────────────────────────────── */
const Modal = ({ title, onClose, children }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      background: "rgba(0,0,0,0.72)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(3px)",
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      className="card"
      style={{
        width: 520,
        maxWidth: "95vw",
        padding: 28,
        position: "relative",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.82rem",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--tx1)",
          }}
        >
          {title}
        </span>
        <Button
          type="text"
          size="small"
          onClick={onClose}
          icon={<X size={16} />}
          style={{ color: "var(--tx3)" }}
        />
      </div>
      {children}
    </div>
  </div>
);

/* ─── Field Row helper ───────────────────────────────────────────── */
const FieldRow = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontFamily: "var(--f-disp)",
        fontSize: "0.60rem",
        fontWeight: 700,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "var(--tx3)",
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const Inp = (props) => <Input {...props} />;

// Wraps antd Select with a synthetic event so all existing onChange(e) => e.target.value handlers stay unchanged
const Sel = ({ children, onChange, value, ...props }) => {
  const options = React.Children.toArray(children)
    .filter((c) => c && c.props)
    .map((c) => ({ value: c.props.value, label: c.props.children }));
  return (
    <AntSelect
      value={value}
      onChange={(val) => onChange?.({ target: { value: val } })}
      options={options}
      style={{ width: "100%" }}
    />
  );
};

/* ─── CSV Upload Modal ───────────────────────────────────────────── */
const CsvModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUpload] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleUpload = async () => {
    if (!file) return;
    setUpload(true);
    setError(null);
    try {
      const res = await api.trades.importCsv(file, "trader");
      setResult(res.data);
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Erreur import");
    } finally {
      setUpload(false);
    }
  };

  return (
    <Modal title="Import CSV Trades" onClose={onClose}>
      {result ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <CheckCircle
            size={36}
            style={{ color: "var(--profit)", margin: "0 auto 12px" }}
          />
          <p
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.82rem",
              color: "var(--profit)",
              marginBottom: 8,
            }}
          >
            Import réussi
          </p>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.75rem",
              color: "var(--tx2)",
            }}
          >
            {result.importedCount ?? result.imported ?? "—"} trade(s) importé(s)
          </p>
          {result.errorCount > 0 && (
            <p
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.72rem",
                color: "var(--warn)",
                marginTop: 4,
              }}
            >
              {result.errorCount} ligne(s) en erreur
            </p>
          )}
          <Button
            size="small"
            onClick={onClose}
            style={{ marginTop: 16 }}
          >
            Fermer
          </Button>
        </div>
      ) : (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${file ? "var(--b3)" : "var(--b2)"}`,
              borderRadius: 10,
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              background: file ? "rgba(0,134,204,0.05)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <Upload
              size={24}
              style={{ color: "var(--tx3)", margin: "0 auto 10px" }}
            />
            {file ? (
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.78rem",
                  color: "var(--cyan)",
                }}
              >
                {file.name}
              </p>
            ) : (
              <>
                <p
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.78rem",
                    color: "var(--tx2)",
                    marginBottom: 4,
                  }}
                >
                  Glisser-déposer ou cliquer
                </p>
                <p className="lbl">
                  CSV · colonnes ISIN, WAY, NOMINAL, PRICE, ACCRUED…
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </div>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 7,
                background: "rgba(207,30,43,0.08)",
                border: "1px solid rgba(207,30,43,0.22)",
                marginBottom: 12,
              }}
            >
              <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
              <span
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.73rem",
                  color: "var(--loss)",
                }}
              >
                {error}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button size="small" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={handleUpload}
              loading={uploading}
              disabled={!file}
            >
              Importer
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

/* ─── Bond Trade Entry Modal ─────────────────────────────────────── */
const BondModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    isin: "",
    way: "BUY",
    nominal: "",
    cleanPrice: "",
    accrued: "",
    gSpread: "",
    yield: "",
    counterparty: "",
    tradeCategory: "TRADING",
    commissionType: "CLEAN",
    tradeDate: today(),
    valueDate: today(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const dirtyPrice = useMemo(() => {
    const cp = parseFloat(form.cleanPrice),
      ac = parseFloat(form.accrued);
    if (!isNaN(cp) && !isNaN(ac)) return (cp + ac).toFixed(6);
    return "";
  }, [form.cleanPrice, form.accrued]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Le trader saisit les prix en % du pair (ex: 102.75).
      // Le backend stocke en fraction décimale (1.0275). Conversion ÷100 ici.
      await api.trades.createBond({
        ...form,
        nominal: parseFloat(form.nominal),
        cleanPrice: parseFloat(form.cleanPrice) / 100,
        accrued: (parseFloat(form.accrued) || 0) / 100,
        dirtyPrice: (parseFloat(dirtyPrice) || 0) / 100,
        gSpread: form.gSpread ? parseFloat(form.gSpread) : null,
        yield: form.yield ? parseFloat(form.yield) : null,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Erreur création trade",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouveau Trade Obligataire" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          }}
        >
          <FieldRow label="ISIN *">
            <Inp
              value={form.isin}
              onChange={set("isin")}
              placeholder="XS1234567890"
              required
            />
          </FieldRow>
          <FieldRow label="Sens *">
            <Sel value={form.way} onChange={set("way")}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </Sel>
          </FieldRow>
          <FieldRow label="Nominal (USD) *">
            <Inp
              type="number"
              value={form.nominal}
              onChange={set("nominal")}
              placeholder="1000000"
              required
              step="1000"
            />
          </FieldRow>
          <FieldRow label="Prix clean *">
            <Inp
              type="number"
              value={form.cleanPrice}
              onChange={set("cleanPrice")}
              placeholder="99.50"
              required
              step="0.0001"
            />
          </FieldRow>
          <FieldRow label="Accrued">
            <Inp
              type="number"
              value={form.accrued}
              onChange={set("accrued")}
              placeholder="0.4167"
              step="0.0001"
            />
          </FieldRow>
          <FieldRow label="Prix dirty (calculé)">
            <div
              style={{
                background: "var(--elev)",
                border: "1px solid var(--b1)",
                borderRadius: 7,
                padding: "8px 12px",
                fontFamily: "var(--f-mono)",
                fontSize: "0.82rem",
                color: "var(--tx2)",
              }}
            >
              {dirtyPrice || "—"}
            </div>
          </FieldRow>
          <FieldRow label="G-Spread (bp)">
            <Inp
              type="number"
              value={form.gSpread}
              onChange={set("gSpread")}
              placeholder="150.5"
              step="0.1"
            />
          </FieldRow>
          <FieldRow label="Yield (%)">
            <Inp
              type="number"
              value={form.yield}
              onChange={set("yield")}
              placeholder="5.25"
              step="0.001"
            />
          </FieldRow>
          <FieldRow label="Contrepartie *">
            <Inp
              value={form.counterparty}
              onChange={set("counterparty")}
              placeholder="BNPP CIB"
              required
            />
          </FieldRow>
          <FieldRow label="Catégorie *">
            <Sel value={form.tradeCategory} onChange={set("tradeCategory")}>
              <option value="TRADING">Trading</option>
              <option value="MARKET_MAKING">Market Making</option>
              <option value="MONTAGE">Montage</option>
            </Sel>
          </FieldRow>
          <FieldRow label="Commission">
            <Sel value={form.commissionType} onChange={set("commissionType")}>
              <option value="CLEAN">Clean</option>
              <option value="DIRTY">Dirty</option>
              <option value="NONE">Aucune</option>
            </Sel>
          </FieldRow>
          <FieldRow label="Date Trade *">
            <Inp
              type="date"
              value={form.tradeDate}
              onChange={set("tradeDate")}
              required
            />
          </FieldRow>
          <FieldRow label="Date Valeur *">
            <Inp
              type="date"
              value={form.valueDate}
              onChange={set("valueDate")}
              required
            />
          </FieldRow>
        </div>
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 7,
              background: "rgba(207,30,43,0.08)",
              border: "1px solid rgba(207,30,43,0.22)",
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
            <span
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.73rem",
                color: "var(--loss)",
              }}
            >
              {error}
            </span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <Button size="small" onClick={onClose}>
            Annuler
          </Button>
          <Button type="primary" size="small" htmlType="submit" loading={saving}>
            Créer Trade
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Futures Trade Entry Modal ──────────────────────────────────── */
const FutureModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    ticker: "",
    way: "BUY",
    nbContracts: "",
    entryPrice: "",
    lastPrice: "",
    hedBondIsin: "",
    counterparty: "",
    commissionType: "CLEAN",
    tradeDate: today(),
    valueDate: today(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.trades.createFuture({
        ...form,
        nbContracts: parseInt(form.nbContracts, 10),
        entryPrice: parseFloat(form.entryPrice),
        lastPrice: form.lastPrice ? parseFloat(form.lastPrice) : null,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Erreur création future",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouveau Trade Futures" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          }}
        >
          <FieldRow label="Ticker *">
            <Inp
              value={form.ticker}
              onChange={set("ticker")}
              placeholder="FGBL Mar25"
              required
            />
          </FieldRow>
          <FieldRow label="Sens *">
            <Sel value={form.way} onChange={set("way")}>
              <option value="BUY">BUY (Long)</option>
              <option value="SELL">SELL (Short)</option>
            </Sel>
          </FieldRow>
          <FieldRow label="Nb Contrats *">
            <Inp
              type="number"
              value={form.nbContracts}
              onChange={set("nbContracts")}
              placeholder="10"
              required
              step="1"
              min="1"
            />
          </FieldRow>
          <FieldRow label="Prix d'entrée *">
            <Inp
              type="number"
              value={form.entryPrice}
              onChange={set("entryPrice")}
              placeholder="133.45"
              required
              step="0.01"
            />
          </FieldRow>
          <FieldRow label="Dernier prix">
            <Inp
              type="number"
              value={form.lastPrice}
              onChange={set("lastPrice")}
              placeholder="133.60"
              step="0.01"
            />
          </FieldRow>
          <FieldRow label="ISIN Obligation couverte">
            <Inp
              value={form.hedBondIsin}
              onChange={set("hedBondIsin")}
              placeholder="XS1234567890"
            />
          </FieldRow>
          <FieldRow label="Contrepartie">
            <Inp
              value={form.counterparty}
              onChange={set("counterparty")}
              placeholder="EUREX"
            />
          </FieldRow>
          <FieldRow label="Commission">
            <Sel value={form.commissionType} onChange={set("commissionType")}>
              <option value="CLEAN">Clean</option>
              <option value="DIRTY">Dirty</option>
              <option value="NONE">Aucune</option>
            </Sel>
          </FieldRow>
          <FieldRow label="Date Trade *">
            <Inp
              type="date"
              value={form.tradeDate}
              onChange={set("tradeDate")}
              required
            />
          </FieldRow>
          <FieldRow label="Date Valeur">
            <Inp
              type="date"
              value={form.valueDate}
              onChange={set("valueDate")}
            />
          </FieldRow>
        </div>
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 7,
              background: "rgba(207,30,43,0.08)",
              border: "1px solid rgba(207,30,43,0.22)",
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
            <span
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.73rem",
                color: "var(--loss)",
              }}
            >
              {error}
            </span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <Button size="small" onClick={onClose}>
            Annuler
          </Button>
          <Button type="primary" size="small" htmlType="submit" loading={saving}>
            Créer Future
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Cancel Confirm Modal ───────────────────────────────────────── */
const CancelModal = ({ trade, onClose, onSuccess }) => {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      await api.trades.cancel(trade.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Erreur annulation",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal title="Confirmer Annulation" onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.80rem",
            color: "var(--tx1)",
            marginBottom: 8,
          }}
        >
          Annuler le trade{" "}
          <span style={{ fontFamily: "var(--f-mono)", color: "var(--cyan)" }}>
            {trade.isin}
          </span>{" "}
          ?
        </p>
        <p
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.74rem",
            color: "var(--tx3)",
          }}
        >
          {(trade.way || "").toUpperCase()} ·{" "}
          {fN(parseFloat(trade.nominal || 0) / 1e6, 2)}M ·{" "}
          {fDate(trade.tradeDate)}
        </p>
        <p
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.72rem",
            color: "var(--warn)",
            marginTop: 8,
          }}
        >
          Cette action est irréversible. Le trade sera marqué comme annulé.
        </p>
      </div>
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 7,
            background: "rgba(207,30,43,0.08)",
            border: "1px solid rgba(207,30,43,0.22)",
            marginBottom: 12,
          }}
        >
          <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.73rem",
              color: "var(--loss)",
            }}
          >
            {error}
          </span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="small" onClick={onClose}>
          Fermer
        </Button>
        <Button
          danger
          size="small"
          onClick={handleCancel}
          loading={cancelling}
        >
          Confirmer Annulation
        </Button>
      </div>
    </Modal>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const BlotterTable = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterWay, setWay] = useState("ALL");
  const [filterSub, setSub] = useState("ALL");
  const [filterStatus, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState("tradeDate");
  const [sortDir, setSortDir] = useState("desc");
  const [showCsv, setShowCsv] = useState(false);
  const [showBond, setShowBond] = useState(false);
  const [showFut, setShowFut] = useState(false);
  const [cancelTrade, setCancelTrade] = useState(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.trades.getAll({});
      setTrades(res.data || []);
    } catch (e) {
      setError(e.message || "Erreur chargement trades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  /* Raccourcis clavier salle de marché :
     N → Nouveau Bond    F → Nouveau Future    F5 → Refresh */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      if (e.key === "F5") {
        e.preventDefault();
        fetchTrades();
        return;
      }
      if (showBond || showFut || showCsv || cancelTrade) return;
      if (e.key === "n" || e.key === "N") setShowBond(true);
      if (e.key === "f" || e.key === "F") setShowFut(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fetchTrades, showBond, showFut, showCsv, cancelTrade]);

  const subAssets = useMemo(
    () => [...new Set(trades.map((t) => t.subAsset).filter(Boolean))],
    [trades],
  );

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        const q = search.toLowerCase();
        const matchQ =
          !q ||
          t.isin?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.counterparty?.toLowerCase().includes(q) ||
          t.assetIdentifier?.toLowerCase().includes(q);
        const matchW =
          filterWay === "ALL" || (t.way || "").toUpperCase() === filterWay;
        const matchS = filterSub === "ALL" || t.subAsset === filterSub;
        const matchSt =
          filterStatus === "ALL" ||
          (filterStatus === "ACTIF" ? !t.isClosed : t.isClosed);
        return matchQ && matchW && matchS && matchSt;
      }),
    [trades, search, filterWay, filterSub, filterStatus],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey],
        vb = b[sortKey];
      const na = parseFloat(va),
        nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb))
        return sortDir === "asc" ? na - nb : nb - na;
      const sa = String(va ?? ""),
        sb = String(vb ?? "");
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const exportBlotterExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h");

    /* Helper format numérique */
    const applyNumFmt = (ws, fmt, cols, fromRow) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = fromRow; r <= range.e.r; r++) {
        cols.forEach((c) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws[addr] && typeof ws[addr].v === "number") ws[addr].z = fmt;
        });
      }
    };

    const hdr = [
      "ID", "Date Trade", "Date Valeur", "Sens", "ISIN / Ticker",
      "Obligation", "Type", "Catégorie", "Nominal", "CCY",
      "Prix Clean", "Prix Dirty", "Accrued", "WAP Dirty",
      "G-Spread (bp)", "Contrepartie", "P&L Réalisé", "Statut",
    ];
    const rows = sorted.map((t) => [
      t.id || "",
      t.tradeDate || "",
      t.valueDate || "",
      t.way || "",
      t.isin || t.assetIdentifier || "",
      t.description || "",
      t.subAsset || "",
      t.tradeCategory || "",
      parseFloat(t.nominal) || "",
      t.currency || "",
      t.cleanPrice != null ? parseFloat(t.cleanPrice) * 100 : "",
      t.dirtyPrice != null ? parseFloat(t.dirtyPrice) * 100 : "",
      t.accrued != null ? parseFloat(t.accrued) * 100 : "",
      t.wapDirty != null ? parseFloat(t.wapDirty) * 100 : "",
      parseFloat(t.gSpread) || "",
      t.counterparty || "",
      parseFloat(t.realizedPnl) || "",
      t.isClosed ? "Clôturé" : "Actif",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: hdr.length - 1 } }),
    };
    ws["!cols"] = [
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 16 },
      { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 6 },
      { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
      { wch: 13 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
    ];
    applyNumFmt(ws, "#,##0",      [8],           1); // Nominal
    applyNumFmt(ws, "#,##0.0000", [10, 11, 12, 13], 1); // Prix %
    applyNumFmt(ws, "#,##0.0",    [14],          1); // G-Spread bp
    applyNumFmt(ws, "#,##0",      [16],          1); // P&L Réalisé
    XLSX.utils.book_append_sheet(wb, ws, "Trades");

    // Stats sheet
    const buys = sorted.filter((t) => t.way === "BUY" && !t.isClosed);
    const sells = sorted.filter((t) => t.way === "SELL" && !t.isClosed);
    const closed = sorted.filter((t) => t.isClosed);
    const stats = [
      ["STATISTIQUES BLOTTER", ""],
      ["Total trades", sorted.length],
      ["Actifs BUY", buys.length],
      ["Actifs SELL", sells.length],
      ["Clôturés", closed.length],
      ["", ""],
      ["Nominal BUY (M)", buys.reduce((s, t) => s + Math.abs(parseFloat(t.nominal || 0)), 0) / 1e6],
      ["Nominal SELL (M)", sells.reduce((s, t) => s + Math.abs(parseFloat(t.nominal || 0)), 0) / 1e6],
      ["P&L Réalisé Total", sorted.reduce((s, t) => s + parseFloat(t.realizedPnl || 0), 0)],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(stats);
    wsStats["!cols"] = [{ wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsStats, "Statistiques");

    XLSX.writeFile(wb, `blotter_${ts}.xlsx`);
  }, [sorted]);

  const Th = ({ k, label, right, center }) => (
    <th
      onClick={() => k && toggleSort(k)}
      style={{
        textAlign: center ? "center" : right ? "right" : "left",
        cursor: k ? "pointer" : "default",
        color: sortKey === k ? "var(--cyan)" : "var(--tx3)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          justifyContent: center ? "center" : right ? "flex-end" : "flex-start",
        }}
      >
        {label}
        {sortKey === k &&
          (sortDir === "asc" ? (
            <ArrowUpRight size={9} style={{ color: "var(--cyan)" }} />
          ) : (
            <ArrowDownRight size={9} style={{ color: "var(--cyan)" }} />
          ))}
      </span>
    </th>
  );

  const totals = useMemo(
    () =>
      sorted.reduce(
        (a, t) => ({
          nominal: a.nominal + parseFloat(t.nominal || 0),
          pnl: a.pnl + (linePnl(t) || 0),
        }),
        { nominal: 0, pnl: 0 },
      ),
    [sorted],
  );

  const onModalSuccess = () => fetchTrades();

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      {showCsv && (
        <CsvModal
          onClose={() => setShowCsv(false)}
          onSuccess={onModalSuccess}
        />
      )}
      {showBond && (
        <BondModal
          onClose={() => setShowBond(false)}
          onSuccess={onModalSuccess}
        />
      )}
      {showFut && (
        <FutureModal
          onClose={() => setShowFut(false)}
          onSuccess={onModalSuccess}
        />
      )}
      {cancelTrade && (
        <CancelModal
          trade={cancelTrade}
          onClose={() => setCancelTrade(null)}
          onSuccess={onModalSuccess}
        />
      )}

      {/* ── Header ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--void)",
          borderBottom: "1px solid var(--b1)",
        }}
      >
        {/* Title row */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 13,
                  background: "var(--profit)",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <h2 className="view-title">Trade Blotter</h2>
              <span className="tag" style={{ marginLeft: 2 }}>
                {sorted.length} trades ·{" "}
                {trades.filter((t) => !t.isClosed).length} actifs
              </span>
            </div>
            <p className="view-sub" style={{ paddingLeft: 9 }}>
              Saisie · Historique · Import CSV
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Button
              type="primary"
              size="small"
              onClick={() => setShowBond(true)}
              icon={<Plus size={10} />}
            >
              Bond
            </Button>
            <Button
              size="small"
              onClick={() => setShowFut(true)}
              icon={<TrendingUp size={10} />}
              style={{
                borderColor: "rgba(20,188,164,0.35)",
                color: "var(--fut)",
              }}
            >
              Future
            </Button>
            <Button
              size="small"
              onClick={exportBlotterExcel}
              icon={<FileSpreadsheet size={10} />}
              title="Exporter le blotter en Excel (.xlsx)"
            >
              Excel
            </Button>
            <Button
              size="small"
              loading={loading}
              onClick={fetchTrades}
              icon={<RefreshCw size={10} />}
            />
          </div>
        </div>

        {/* Filter row */}
        <div
          style={{
            padding: "5px 16px 7px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: "1px solid var(--b0)",
            flexWrap: "wrap",
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ISIN, description, contrepartie…"
            prefix={<Search size={11} style={{ color: "var(--tx3)" }} />}
            size="small"
            style={{ width: 210 }}
          />
          {["ALL", "BUY", "SELL"].map((w) => (
            <button
              key={w}
              onClick={() => setWay(w)}
              style={{
                padding: "2px 7px",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "var(--f-disp)",
                fontSize: "0.57rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background:
                  filterWay === w
                    ? w === "BUY"
                      ? "rgba(30,127,255,0.18)"
                      : w === "SELL"
                        ? "rgba(255,43,96,0.15)"
                        : "rgba(200,145,12,0.15)"
                    : "transparent",
                color:
                  filterWay === w
                    ? w === "BUY"
                      ? "#60A5FA"
                      : w === "SELL"
                        ? "var(--loss)"
                        : "var(--cyan)"
                    : "var(--tx3)",
                border: `1px solid ${filterWay === w ? (w === "BUY" ? "rgba(30,127,255,0.30)" : w === "SELL" ? "rgba(255,43,96,0.28)" : "rgba(200,145,12,0.28)") : "var(--b1)"}`,
                transition: "all 0.12s",
              }}
            >
              {w === "ALL" ? "Tous" : w}
            </button>
          ))}
          <AntSelect
            value={filterSub}
            onChange={(v) => setSub(v)}
            size="small"
            style={{ width: 130 }}
            popupMatchSelectWidth={false}
          >
            <Option value="ALL">Tous actifs</Option>
            {subAssets.map((s) => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </AntSelect>
          <AntSelect
            value={filterStatus}
            onChange={(v) => setStatus(v)}
            size="small"
            style={{ width: 120 }}
            popupMatchSelectWidth={false}
          >
            <Option value="ALL">Tous statuts</Option>
            <Option value="ACTIF">Actifs</Option>
            <Option value="ANNULE">Annulés</Option>
          </AntSelect>
        </div>
      </div>

      {/* ── Summary Strip ── */}
      {trades.length > 0 && (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            background: "var(--surf)",
          }}
        >
          {[
            {
              label: "Actifs",
              value: trades.filter((t) => !t.isClosed).length,
              col: "var(--profit)",
            },
            {
              label: "Annulés",
              value: trades.filter((t) => t.isClosed).length,
              col: "var(--tx3)",
            },
            {
              label: "BUY",
              value: trades.filter(
                (t) => !t.isClosed && (t.way || "").toUpperCase() === "BUY",
              ).length,
              col: "#60A5FA",
            },
            {
              label: "SELL",
              value: trades.filter(
                (t) => !t.isClosed && (t.way || "").toUpperCase() === "SELL",
              ).length,
              col: "var(--loss)",
            },
            {
              label: "Bonds",
              value: trades.filter(
                (t) =>
                  !(t.subAsset || "").toLowerCase().includes("future") &&
                  !t.isClosed,
              ).length,
              col: "var(--cyan)",
            },
            {
              label: "Futures",
              value: trades.filter(
                (t) =>
                  (t.subAsset || "").toLowerCase().includes("future") &&
                  !t.isClosed,
              ).length,
              col: "var(--fut)",
            },
          ].map(({ label, value, col }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "baseline", gap: 5 }}
            >
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: col,
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-disp)",
                  fontSize: "0.54rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "var(--tx3)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileText size={11} style={{ color: "var(--tx3)" }} />
            <Button
              size="small"
              onClick={() => setShowCsv(true)}
              icon={<Upload size={10} />}
            >
              Import CSV
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            margin: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 7,
            background: "rgba(207,30,43,0.08)",
            border: "1px solid rgba(207,30,43,0.22)",
          }}
        >
          <AlertTriangle size={13} style={{ color: "var(--loss)" }} />
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.73rem",
              color: "var(--loss)",
            }}
          >
            {error}
          </span>
          <Button
            size="small"
            onClick={fetchTrades}
            style={{ marginLeft: "auto" }}
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="dtable">
          <thead>
            <tr>
              <Th k="tradeDate" label="Date Trade" />
              <Th k="valueDate" label="Date Val." />
              <Th k="way" label="Sens" center />
              <Th k="assetIdentifier" label="ISIN/Ticker" />
              <Th k="description" label="Obligation" />
              <Th k="subAsset" label="Type" center />
              <Th k="tradeCategory" label="Catég." center />
              <Th k="nominal" label="Nominal" right />
              <Th k="cleanPrice" label="Prix Clean" right />
              <Th k="dirtyPrice" label="Prix Dirty" right />
              <Th k="accrued" label="Accrued" right />
              <Th k="wapDirty" label="WAP Dirty" right />
              <Th k="gSpread" label="G-Spread" right />
              <Th k="counterparty" label="Contrepartie" />
              <Th k="mtmPnl" label="P&L Latent" right />
              <Th k="isClosed" label="Statut" center />
              <th style={{ textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => {
              const isFut = (t.subAsset || "").toLowerCase().includes("future");
              const rowBg = t.isClosed
                ? "rgba(30,61,94,0.10)"
                : idx % 2 === 0
                  ? "rgba(8,24,41,0.50)"
                  : "transparent";
              const isin = t.isin || t.assetIdentifier || "—";
              return (
                <tr
                  key={t.id || idx}
                  style={{ background: rowBg, opacity: t.isClosed ? 0.6 : 1 }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(12,31,58,0.70)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = rowBg)
                  }
                >
                  <td
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fDate(t.tradeDate)}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx3)",
                    }}
                  >
                    {fDate(t.valueDate)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <WayBadge way={t.way} />
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: isFut ? "var(--fut)" : "var(--cyan)",
                      fontWeight: 500,
                    }}
                  >
                    {isin}
                  </td>
                  <td
                    style={{
                      textAlign: "left",
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.71rem",
                      color: "var(--tx1)",
                    }}
                    title={t.description}
                  >
                    {t.description || (isFut ? "Future" : "—")}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <SubBadge sub={t.subAsset} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <TradeCatBadge cat={t.tradeCategory} />
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      fontWeight: 500,
                    }}
                  >
                    {isFut ? (
                      <>
                        {t.nbContracts || "—"}
                        <span
                          style={{
                            color: "var(--tx3)",
                            fontSize: "0.58rem",
                            marginLeft: 1,
                          }}
                        >
                          cts
                        </span>
                      </>
                    ) : (
                      <>
                        {fN(parseFloat(t.nominal || 0) / 1e6, 2)}
                        <span
                          style={{
                            color: "var(--tx3)",
                            fontSize: "0.58rem",
                            marginLeft: 1,
                          }}
                        >
                          M
                        </span>
                      </>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                    }}
                  >
                    {fPx(t.cleanPrice ?? t.entryPrice)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fPx(t.dirtyPrice ?? t.lastPrice)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx3)",
                    }}
                  >
                    {fPx(t.accrued)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fPx(t.wapDirty)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "#FCD34D",
                    }}
                  >
                    {t.gSpread != null ? `${fN(t.gSpread, 1)}bp` : "—"}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.70rem",
                      color: "var(--tx2)",
                      maxWidth: 110,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.counterparty || "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: pnlColor(linePnl(t)),
                    }}
                  >
                    {linePnl(t) != null ? fN(linePnl(t), 0) : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatusBadge isClosed={t.isClosed} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {!t.isClosed && (
                      <Button
                        danger
                        size="small"
                        onClick={() => setCancelTrade(t)}
                        title="Annuler trade"
                        icon={<Trash2 size={10} />}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "left",
                    fontFamily: "var(--f-disp)",
                    fontWeight: 700,
                    fontSize: "0.60rem",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                  }}
                >
                  Total{" "}
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      color: "var(--cyan)",
                    }}
                  >
                    ({sorted.length})
                  </span>
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: "var(--tx1)",
                    fontWeight: 600,
                  }}
                >
                  {(totals.nominal / 1e6).toFixed(2)}
                  <span
                    style={{
                      color: "var(--tx3)",
                      fontSize: "0.58rem",
                      marginLeft: 1,
                    }}
                  >
                    M
                  </span>
                </td>
                <td colSpan={5} />
                <td />
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: pnlColor(totals.pnl),
                    fontWeight: 700,
                  }}
                >
                  {totals.pnl !== 0 ? fN(totals.pnl, 0) : "—"}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sorted.length === 0 && !loading && (
        <div
          style={{ textAlign: "center", padding: "48px", color: "var(--tx3)" }}
        >
          <Activity size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem" }}>
            Aucun trade trouvé. Créez un trade ou importez un CSV.
          </p>
        </div>
      )}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: "2px solid var(--b1)",
              borderTopColor: "var(--cyan)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BlotterTable;
