import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "antd";
import { useTrading } from "../../contexts/TradingContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MainContent from "./MainContent";
import TickerBar from "./TickerBar";
import { RefreshCw, AlertTriangle, Activity } from "lucide-react";

// Écrans valides — doit correspondre EXACTEMENT aux "case" de MainContent.jsx
// et aux "id" de la Sidebar (vérifiés un par un).
const SCREENS = [
  "portfolio", "eurobonds", "cln", "egp", "tbills",
  "futures", "pricing", "blotter", "risk", "reporting", "recon",
];

const TradingDashboard = () => {
  const { loading, error, refresh, activeInstrument, setActiveInstrument } =
    useTrading();
  const navigate = useNavigate();
  const params = useParams();
  // Segment d'URL après /trader/ (route déclarée "/trader/*" dans App.jsx)
  const urlScreen = (params["*"] || "").split("/")[0];
  // Garde anti-écho : mise à true quand on synchronise l'état DEPUIS l'URL, pour
  // que l'effet « état → URL » ne re-navigue PAS en réaction. C'est ce qui élimine
  // la boucle qui faisait sauter l'URL toute seule (ex. eurobonds → risk).
  const fromUrl = useRef(false);

  // ── URL → état : navigation par URL (deep-link, Précédent/Suivant, F5) ──
  useEffect(() => {
    if (urlScreen && SCREENS.includes(urlScreen)) {
      if (urlScreen !== activeInstrument) {
        fromUrl.current = true; // ce changement d'état vient de l'URL
        setActiveInstrument(urlScreen);
      }
    } else {
      // URL sans écran (/trader) ou écran invalide → normalisation propre
      navigate(`/trader/${activeInstrument}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlScreen]);

  // ── État → URL : UNIQUEMENT sur un vrai clic Sidebar ──
  // Si le changement d'état a été provoqué par l'URL (fromUrl=true), on NE
  // re-navigue pas → pas d'écho, pas de boucle, pas de saut d'URL automatique.
  useEffect(() => {
    if (fromUrl.current) {
      fromUrl.current = false;
      return;
    }
    if (activeInstrument && activeInstrument !== urlScreen) {
      navigate(`/trader/${activeInstrument}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstrument]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Animated logo placeholder */}
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid var(--b1)",
              borderTopColor: "var(--cyan)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 8,
              border: "1px solid var(--b0)",
              borderTopColor: "var(--profit)",
              borderRadius: "50%",
              animation: "spin 1.5s linear infinite reverse",
            }}
          />
          <Activity
            size={16}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: "var(--cyan)",
            }}
          />
        </div>

        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 600,
              fontSize: "0.82rem",
              color: "var(--tx1)",
              letterSpacing: "0.04em",
            }}
          >
            Chargement du Trading Desk
          </p>
          <p
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.60rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--tx3)",
              marginTop: 6,
            }}
          >
            Fixed Income — Desk International
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--cyan)",
                animation: `pulse-live 1.2s ease infinite ${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(255,43,96,0.10)",
            border: "1px solid rgba(255,43,96,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={24} style={{ color: "var(--loss)" }} />
        </div>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <h2
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--loss)",
              marginBottom: 8,
            }}
          >
            Erreur de connexion
          </h2>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.78rem",
              color: "var(--tx2)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
          <Button
            size="small"
            onClick={refresh}
            icon={<RefreshCw size={12} />}
            style={{ margin: "0 auto", display: "inline-flex" }}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "var(--void)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar />
        <MainContent />
      </div>
      <TickerBar />
    </div>
  );
};

export default TradingDashboard;
