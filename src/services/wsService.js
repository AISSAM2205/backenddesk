import { Client } from "@stomp/stompjs";

// Backend Spring Boot écoute sur 8081 (cf. application.properties + proxy Vite).
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
const WS_URL = BASE.replace(/^http/, "ws") + "/ws";

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
