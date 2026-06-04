import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTrading } from "../../contexts/TradingContext";

/* ─── live clock ─────────────────────────────────────────────────── */
const useClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

/* ─── formatters ─────────────────────────────────────────────────── */
const fMAD = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const a = Math.abs(n),
    s = n >= 0 ? "+" : "−";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}k`;
  return `${s}${a.toFixed(0)}`;
};
const fBp = (v) => {
  const n = parseFloat(v);
  return isNaN(n) || n === 0 ? null : `${n.toFixed(1)}`;
};
const fPct = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : `${n.toFixed(3)}%`;
};
const fDv = (v) => {
  const n = parseFloat(v || 0);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
};
const fPerfWap = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const pct = n * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
};

/* ─── settlement date J+2 (skip weekends) ───────────────────────── */
const settlementDate = (ref) => {
  const d = new Date(ref);
  let n = 0;
  while (n < 2) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

/* ─── color tokens ───────────────────────────────────────────────── */
const C = {
  RED: "#FF3B3B",
  RED_DIM: "#C43030",
  RED_LO: "#8A1E1E",
  GREEN: "#00E899",
  WARN: "#FFA500",
  CYAN: "#00CAFF",
  WHITE: "#D4E8F5",
  DIM: "#4A6A84",
  SEP: "#3A0F0F",
  VIOLET: "#C084FC",
  YELLOW: "#FCD34D",
};

/* ─── atoms ──────────────────────────────────────────────────────── */
const Seg = ({ children, color = C.WHITE, bold, dim, size = "0.68rem" }) => (
  <span
    style={{
      color: dim ? C.DIM : color,
      fontWeight: bold ? 700 : 400,
      fontFamily: "var(--f-mono)",
      fontSize: size,
      letterSpacing: "0.01em",
    }}
  >
    {children}
  </span>
);

const Lbl = ({ children }) => (
  <span
    style={{
      color: C.RED_DIM,
      fontFamily: "var(--f-disp)",
      fontSize: "0.53rem",
      fontWeight: 700,
      letterSpacing: "0.11em",
      textTransform: "uppercase",
      marginRight: 3,
    }}
  >
    {children}
  </span>
);

const Sep = () => (
  <span
    style={{
      color: C.SEP,
      fontFamily: "var(--f-mono)",
      fontSize: "0.72rem",
      padding: "0 12px",
      userSelect: "none",
    }}
  >
    ◆
  </span>
);

const Dot = ({ color, glow }) => (
  <span
    style={{
      width: 5,
      height: 5,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
      display: "inline-block",
      boxShadow: glow ? `0 0 5px ${color}` : "none",
    }}
  />
);

/* ─── market sessions ────────────────────────────────────────────── */
const MARKETS = [
  {
    id: "CAS",
    label: "CAS",
    tz: "Africa/Casablanca",
    utcOpen: 9,
    utcClose: 15.5,
  },
  { id: "LDN", label: "LDN", tz: "Europe/London", utcOpen: 8, utcClose: 17.5 },
  {
    id: "NY",
    label: "NY",
    tz: "America/New_York",
    utcOpen: 13.5,
    utcClose: 21,
  },
];

const MarketSessionItem = ({ clock }) => {
  const utcH = clock.getUTCHours() + clock.getUTCMinutes() / 60;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "0 4px",
      }}
    >
      <Lbl>Sessions</Lbl>
      {MARKETS.map(({ id, label, tz, utcOpen, utcClose }) => {
        const open = utcH >= utcOpen && utcH < utcClose;
        const localTime = clock.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: tz,
        });
        return (
          <span
            key={id}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Dot color={open ? C.GREEN : C.RED_DIM} glow={open} />
            <Seg color={open ? C.GREEN : C.DIM} bold={open} size="0.67rem">
              {label}
            </Seg>
            <Seg color={open ? C.WHITE : C.DIM} size="0.65rem">
              {localTime}
            </Seg>
          </span>
        );
      })}
    </span>
  );
};

/* ─── headline block ─────────────────────────────────────────────── */
const HeadlineItem = ({
  g,
  alerts,
  posCount,
  clock,
  buyCount = 0,
  limitPct = 0,
}) => {
  const pnl = parseFloat(g?.totalPlEcoMad ?? 0);
  const daily = parseFloat(g?.totalNetDailyMad ?? 0);
  const dv01 = parseFloat(g?.totalDv01Usd ?? 0);
  const dur = parseFloat(g?.portfolioDuration ?? 0);
  const fund = parseFloat(g?.totalFundingCostMad ?? 0);
  const val = settlementDate(clock);
  const sp = <Seg dim> </Seg>;
  const limColor = limitPct > 95 ? C.RED : limitPct > 80 ? C.WARN : C.GREEN;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        padding: "0 6px",
      }}
    >
      <span
        style={{
          background: C.RED,
          color: "#000",
          fontFamily: "var(--f-disp)",
          fontWeight: 800,
          fontSize: "0.54rem",
          letterSpacing: "0.12em",
          padding: "1px 6px",
          borderRadius: 2,
          marginRight: 10,
        }}
      >
        AWB ITD
      </span>

      <Lbl>Val.</Lbl>
      <Seg color={C.WARN} bold>
        {val}
      </Seg>
      {sp}
      <Lbl>Pos</Lbl>
      <Seg color={C.CYAN} bold>
        {posCount > 0 ? posCount : "—"}
      </Seg>
      {sp}
      <Lbl>P&L Éco</Lbl>
      <Seg color={pnl >= 0 ? C.GREEN : C.RED} bold>
        {pnl !== 0 ? `${fMAD(pnl)} MAD` : "—"}
      </Seg>
      {sp}
      <Lbl>Net/j</Lbl>
      <Seg color={daily >= 0 ? C.GREEN : C.RED} bold>
        {daily !== 0 ? `${fMAD(daily)} MAD` : "—"}
      </Seg>
      {sp}
      <Lbl>DV01</Lbl>
      <Seg color={C.CYAN}>{dv01 > 0 ? `${fDv(dv01)} $/bp` : "—"}</Seg>
      {sp}
      <Lbl>Dur.</Lbl>
      <Seg color={C.VIOLET}>{dur > 0 ? `${dur.toFixed(2)} ans` : "—"}</Seg>
      {sp}
      <Lbl>Lim.</Lbl>
      <Seg color={limColor} bold>
        {limitPct > 0 ? `${limitPct.toFixed(0)}%` : "—"}
      </Seg>
      {buyCount > 0 && (
        <>
          {sp}
          <span
            style={{
              background: "rgba(0,232,153,0.15)",
              border: "1px solid rgba(0,232,153,0.35)",
              borderRadius: 2,
              padding: "0 5px",
              marginLeft: 4,
              fontFamily: "var(--f-disp)",
              fontSize: "0.52rem",
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: C.GREEN,
            }}
          >
            ▲ {buyCount} BUY
          </span>
        </>
      )}
      {fund !== 0 && (
        <>
          {sp}
          <Lbl>Fin/j</Lbl>
          <Seg color={C.WARN}>{fMAD(fund) ?? "—"}</Seg>
        </>
      )}
      {alerts > 0 && (
        <>
          {sp}
          <span
            style={{
              background: "rgba(255,43,96,0.22)",
              border: "1px solid rgba(255,43,96,0.42)",
              borderRadius: 2,
              padding: "0 6px",
              marginLeft: 4,
              fontFamily: "var(--f-disp)",
              fontSize: "0.53rem",
              fontWeight: 800,
              letterSpacing: "0.10em",
              color: C.RED,
              animation: "ticker-blink 1.4s ease infinite",
            }}
          >
            ⚠ {alerts} CARRY NEG
          </span>
        </>
      )}
    </span>
  );
};

/* ─── position block ─────────────────────────────────────────────── */
const PositionItem = ({ r }) => {
  const isBuy = r.decision === "BUY";
  const isAlert = r.netDailyAlert;
  const desc = (r.description || "").split(" ").slice(0, 4).join(" ");
  const pxMid = r.pxMid != null ? (parseFloat(r.pxMid) * 100).toFixed(3) : null;
  const gSpread = fBp(r.gSpreadBid);
  const iSpread = fBp(r.iSpreadBid);
  const carry = fMAD(r.netDailyMad);
  const carryN = parseFloat(r.netDailyMad || 0);
  const dv01 = parseFloat(r.dv01Bond || 0);
  const perf = fPerfWap(r.perfWap);
  const perfN = parseFloat(r.perfWap || 0);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        padding: "0 4px",
      }}
    >
      {isAlert && (
        <span
          style={{
            color: C.RED,
            fontSize: "0.65rem",
            marginRight: 5,
            animation: "ticker-blink 1.4s ease infinite",
          }}
        >
          ⚠
        </span>
      )}
      <Seg color={isAlert ? C.RED : "#FF7A7A"} bold>
        {r.isin}
      </Seg>
      {desc && (
        <>
          <Seg dim> </Seg>
          <Seg color={C.WHITE} size="0.66rem">
            {desc}
          </Seg>
        </>
      )}
      {pxMid && (
        <>
          <Seg dim> Px </Seg>
          <Seg color={C.YELLOW} bold>
            {pxMid}
          </Seg>
        </>
      )}
      {perf && (
        <>
          <Seg dim> </Seg>
          <Seg color={perfN >= 0 ? C.GREEN : C.RED} size="0.64rem">
            {perf}
          </Seg>
        </>
      )}
      {gSpread && (
        <>
          <Seg dim> G-Spd </Seg>
          <Seg color={C.YELLOW}>{gSpread} bp</Seg>
        </>
      )}
      {iSpread && (
        <>
          <Seg dim> / I-Spd </Seg>
          <Seg color="#F0C060">{iSpread} bp</Seg>
        </>
      )}
      {dv01 > 0 && (
        <>
          <Seg dim> DV01 </Seg>
          <Seg color="#60A5FA">{fDv(dv01)}</Seg>
        </>
      )}
      {carry && (
        <>
          <Seg dim> Carry/j </Seg>
          <Seg color={carryN >= 0 ? C.GREEN : C.RED} bold>
            {carry} MAD
          </Seg>
        </>
      )}
      {isBuy && (
        <span
          style={{
            marginLeft: 7,
            background: "rgba(0,232,153,0.15)",
            border: "1px solid rgba(0,232,153,0.35)",
            borderRadius: 2,
            padding: "0 5px",
            fontFamily: "var(--f-disp)",
            fontSize: "0.52rem",
            fontWeight: 800,
            letterSpacing: "0.10em",
            color: C.GREEN,
          }}
        >
          ▲ BUY
        </span>
      )}
    </span>
  );
};

/* ─── FX / rate block ────────────────────────────────────────────── */
const FxItem = ({
  pair,
  value,
  dec = 4,
  pct = false,
  suffix = "",
  isRef = false,
}) => {
  const n = parseFloat(value);
  const display = isNaN(n)
    ? "—"
    : pct
      ? `${(n * 100).toFixed(dec)}%`
      : `${n.toFixed(dec)}${suffix}`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "0 4px",
      }}
    >
      <Seg color={isRef ? "#3A6A8A" : C.CYAN} bold size="0.66rem">
        {pair}
      </Seg>
      <Seg color={isRef ? "#4A7A9A" : C.WHITE}>{display}</Seg>
      {isRef && (
        <span
          style={{
            fontFamily: "var(--f-disp)",
            fontSize: "0.44rem",
            fontWeight: 700,
            letterSpacing: "0.09em",
            color: C.DIM,
            opacity: 0.65,
          }}
        >
          REF
        </span>
      )}
    </span>
  );
};

/* ─── TickerBar ──────────────────────────────────────────────────── */
const TickerBar = () => {
  const { dashboardRows, globalDashboard, rates, connectionStatus } =
    useTrading();
  const { user } = useAuth();
  const trackRef = useRef(null);
  const [animDur, setAnimDur] = useState(90);
  const [limitEur, setLimitEur] = useState(280e6);
  const clock = useClock();

  useEffect(() => {
    const readLimit = () => {
      try {
        const raw = localStorage.getItem(`trader_limits_${user?.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const val = parseFloat(parsed?.eurobonds?.limit);
          if (!isNaN(val) && val > 0) {
            setLimitEur(val);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      setLimitEur(280e6);
    };
    readLimit();
    const onUpdate = (e) => {
      if (!e.detail || e.detail.traderId === user?.id) readLimit();
    };
    window.addEventListener("traderLimitsUpdated", onUpdate);
    return () => window.removeEventListener("traderLimitsUpdated", onUpdate);
  }, [user?.id]);

  const positions = useMemo(
    () =>
      (dashboardRows || []).filter(
        (r) =>
          parseFloat(r.dv01Bond || 0) > 0 || parseFloat(r.netNominal || 0) > 0,
      ),
    [dashboardRows],
  );

  const alerts = useMemo(
    () => (dashboardRows || []).filter((r) => r.netDailyAlert).length,
    [dashboardRows],
  );

  const buyCount = useMemo(
    () => (dashboardRows || []).filter((r) => r.decision === "BUY").length,
    [dashboardRows],
  );

  const limitPct = useMemo(() => {
    // totalNominalMad contient en réalité des USD (nommé de manière trompeuse côté backend)
    const nominalUsd = parseFloat(globalDashboard?.totalNominalMad || 0);
    if (nominalUsd <= 0) return 0;
    const usdMadRate = parseFloat(rates?.usdMad || 9.251);
    const eurMadRate = parseFloat(rates?.eurMad || 10.418);
    // Conversion cohérente : nominal USD → MAD, limite EUR → MAD
    const nominalMad = nominalUsd * usdMadRate;
    const limitMad   = limitEur   * eurMadRate;
    return limitMad > 0 ? Math.min((nominalMad / limitMad) * 100, 110) : 0;
  }, [globalDashboard, limitEur, rates]);

  /* build item list — does NOT include session (clock-based, handled in renderItem) */
  const items = useMemo(() => {
    const arr = [];

    arr.push({ type: "headline" });

    positions.forEach((r) => arr.push({ type: "position", r }));

    /* market sessions — always present regardless of backend */
    arr.push({ type: "session" });

    /* FX — always shown; reference values from Excel when API unavailable */
    const noRates = !rates;
    arr.push({
      type: "fx",
      pair: "EUR/MAD",
      value: rates?.eurMad ?? 10.418,
      dec: 3,
      isRef: noRates,
    });
    arr.push({
      type: "fx",
      pair: "USD/MAD",
      value: rates?.usdMad ?? 9.251,
      dec: 3,
      isRef: noRates,
    });
    arr.push({
      type: "fx",
      pair: "EUR/USD",
      value: rates?.eurUsd ?? 1.126,
      dec: 3,
      isRef: noRates,
    });
    if (rates?.usdEgp)
      arr.push({ type: "fx", pair: "USD/EGP", value: rates.usdEgp, dec: 4 });

    /* reference rates — always shown */
    arr.push({
      type: "rate",
      pair: "ESTR",
      value: rates?.estr ?? "2.17",
      dec: 2,
      suffix: "%",
      isRef: noRates,
    });
    arr.push({
      type: "rate",
      pair: "SOFR",
      value: rates?.sofr ?? "4.30",
      dec: 2,
      suffix: "%",
      isRef: noRates,
    });
    arr.push({
      type: "rate",
      pair: "SOFR 10Y",
      value: rates?.sofr10Year ?? "3.90",
      dec: 2,
      suffix: "%",
      isRef: noRates,
    });
    if (rates?.madT3m)
      arr.push({
        type: "rate",
        pair: "MAD T3M",
        value: rates.madT3m,
        dec: 3,
        pct: true,
      });
    if (rates?.madT6m)
      arr.push({
        type: "rate",
        pair: "MAD T6M",
        value: rates.madT6m,
        dec: 3,
        pct: true,
      });

    return arr;
  }, [positions, rates]);

  /* auto-adjust scroll speed based on content length */
  useEffect(() => {
    if (trackRef.current) {
      const halfW = trackRef.current.scrollWidth / 2;
      setAnimDur(Math.round(Math.max(halfW / 90, 40)));
    }
  }, [items]);

  /* renderItem closes over clock so sessions are always live */
  const renderItem = (item, i) => {
    switch (item.type) {
      case "headline":
        return (
          <HeadlineItem
            key={`h-${i}`}
            g={globalDashboard}
            alerts={alerts}
            posCount={positions.length}
            clock={clock}
            buyCount={buyCount}
            limitPct={limitPct}
          />
        );
      case "position":
        return <PositionItem key={`p-${i}-${item.r.isin}`} r={item.r} />;
      case "session":
        return <MarketSessionItem key={`s-${i}`} clock={clock} />;
      case "fx":
      case "rate":
        return (
          <FxItem
            key={`f-${i}`}
            pair={item.pair}
            value={item.value}
            dec={item.dec}
            pct={item.pct}
            suffix={item.suffix}
            isRef={item.isRef}
          />
        );
      default:
        return null;
    }
  };

  const segments = items.map((item, i) => (
    <React.Fragment key={i}>
      {renderItem(item, i)}
      <Sep />
    </React.Fragment>
  ));

  const isLive = connectionStatus === "connected";

  return (
    <div
      style={{
        height: 28,
        background: "#020810",
        borderTop: `1px solid ${C.RED_LO}`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Left badge */}
      <div
        style={{
          height: "100%",
          padding: "0 10px",
          flexShrink: 0,
          zIndex: 3,
          background: isLive ? "rgba(0,232,153,0.15)" : C.RED,
          borderRight: `1px solid ${isLive ? "rgba(0,232,153,0.30)" : C.RED}`,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            flexShrink: 0,
            background: isLive ? C.GREEN : "#000",
            boxShadow: isLive ? `0 0 6px ${C.GREEN}` : "none",
            animation: isLive ? "ticker-blink 2s ease infinite" : "none",
          }}
        />
        <span
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 800,
            fontSize: "0.55rem",
            letterSpacing: "0.14em",
            color: isLive ? C.GREEN : "#000",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {isLive ? "LIVE" : "DATA"}
        </span>
      </div>

      {/* Left fade */}

      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          position: "relative",
          display: "flex",
          flex: "1 0 auto",
          width: "100%",
          overflow: "hidden",
          flexShrink: 0,
          alignItems: "center",
          whiteSpace: "nowrap",
          height: "100%",
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 32,
            zIndex: 2,
            background: "linear-gradient(to right, #020810, transparent)",
            pointerEvents: "none",
          }}
        />
        {/* Right fade */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            zIndex: 2,
            background: "linear-gradient(to left, #020810, transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          ref={trackRef}
          style={{
            position: "relative",
            display: "flex",
            flex: "1 0 auto",
            flexShrink: 0,
            alignItems: "center",
            whiteSpace: "nowrap",
            height: "100%",
            animation: `ticker-scroll ${animDur}s linear infinite`,
            willChange: "transform",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {segments}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {segments}
          </span>
        </div>
      </div>

      {/* Right static panel: clock */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          background: "#020810",
          borderLeft: `1px solid ${C.RED_LO}`,
          padding: "0 10px",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.70rem",
            fontWeight: 600,
            color: C.RED,
            letterSpacing: "0.04em",
          }}
        >
          {clock.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ticker-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.30; }
        }
      `}</style>
    </div>
  );
};

export default TickerBar;
