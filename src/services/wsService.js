import { Client } from "@stomp/stompjs";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
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
      debug: (str) => console.log("[STOMP]", str),

      onConnect: () => {
        this.connected = true;
        this._emit({ type: "CONNECTION_STATUS", status: "connected" });
        this.client.subscribe("/topic/heartbeat", (message) => {
          try {
            const data = JSON.parse(message.body);
            this._emit({ type: "DATA", payload: data });
          } catch {
            this._emit({ type: "DATA", payload: {} });
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
