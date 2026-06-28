import { Client } from "@stomp/stompjs";

// Le REST passe par les chemins relatifs (/api/*) proxifiés par Vite, mais le
// WebSocket STOMP a besoin d'une URL ABSOLUE ws(s)://host/ws.
//   • VITE_API_BASE_URL renseigné  → on le réutilise (http→ws).
//   • base VIDE en dev             → backend Spring Boot sur :8081.
//   • base VIDE en prod            → même origine que la page (front=back).
// NB : on utilise `||` (et non `??`) car VITE_API_BASE_URL vaut "" (chaîne vide)
// dans .env — `??` ne l'aurait pas remplacé et l'URL serait devenue "/ws".
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "";
const WS_URL = RAW_BASE
  ? RAW_BASE.replace(/^http/, "ws") + "/ws"
  : import.meta.env.DEV
    ? "ws://localhost:8081/ws"
    : (window.location.protocol === "https:" ? "wss://" : "ws://") +
      window.location.host + "/ws";

class WsService {
  constructor() {
    this.client = null;
    this.listeners = new Set();
    this.connected = false;
  }

  connect() {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Console propre en démo : le debug STOMP loggue chaque frame (~800 ms)
      // et noie la console. Réactiver ponctuellement pour diagnostiquer le WS.
      debug: () => {},

      onConnect: () => {
        this.connected = true;
        this._emit({ type: "CONNECTION_STATUS", status: "connected" });

        // Heartbeat : déclenche un rafraîchissement des agrégats lourds (REST).
        this.client.subscribe("/topic/heartbeat", (message) => {
          try {
            const data = JSON.parse(message.body);
            this._emit({ type: "DATA", payload: data });
          } catch {
            this._emit({ type: "DATA", payload: {} });
          }
        });

        // Flux de marché : lot de ticks Bid/Ask/Last à haute fréquence.
        // Émis comme événement "MARKET" distinct → consommé par MarketDataContext
        // sans recharger les agrégats (mise à jour purement incrémentale).
        this.client.subscribe("/topic/market", (message) => {
          try {
            const ticks = JSON.parse(message.body);
            this._emit({ type: "MARKET", payload: ticks });
          } catch {
            /* ignore tick malformé */
          }
        });

        // Taux de référence (FX spot) poussés en continu par le backend.
        // Émis comme "RATES" → TradingContext met à jour le bandeau en direct,
        // sans dépendre du heartbeat (30 s).
        this.client.subscribe("/topic/rates", (message) => {
          try {
            const payload = JSON.parse(message.body);
            this._emit({ type: "RATES", payload });
          } catch {
            /* ignore */
          }
        });

        // Gouvernance : poussé par AdminController après toute modification
        // de limite/objectif. GovernanceContext s'y abonne pour mettre à jour
        // le trader instantanément, sans refresh, quel que soit le poste.
        this.client.subscribe("/topic/governance", (message) => {
          try {
            const payload = JSON.parse(message.body);
            this._emit({ type: "GOVERNANCE", payload });
          } catch {
            this._emit({ type: "GOVERNANCE", payload: {} });
          }
        });
      },

      onDisconnect: () => {
        this.connected = false;
        this._emit({ type: "CONNECTION_STATUS", status: "disconnected" });
      },

      onStompError: () => {
        this.connected = false;
        this._emit({ type: "CONNECTION_STATUS", status: "error" });
      },
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.connected = false;
  }

  ping() {
    if (this.client?.active) {
      this.client.publish({ destination: "/app/ping", body: "{}" });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(event) {
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        /* ignore */
      }
    });
  }
}

export const wsService = new WsService();
export default wsService;
