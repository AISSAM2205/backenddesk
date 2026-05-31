// src/services/sseService.js — SSE client for /api/stream/positions
class SseService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Set();
    this.reconnectDelay = 3000;
    this.maxReconnectDelay = 30000;
    this.currentDelay = 3000;
    this.reconnectTimer = null;
    this.connected = false;
    this.url = null;
  }

  connect(url = "/api/stream/positions") {
    this.url = url;
    if (this.eventSource) this.disconnect();

    try {
      this.eventSource = new EventSource(
        (import.meta.env.VITE_API_BASE_URL ?? "") + url,
      );

      this.eventSource.onopen = () => {
        this.connected = true;
        this.currentDelay = this.reconnectDelay;
        this._emit({ type: "CONNECTION_STATUS", status: "connected" });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit({ type: "DATA", payload: data });
        } catch {
          this._emit({ type: "DATA", payload: event.data });
        }
      };

      this.eventSource.onerror = () => {
        this.connected = false;
        this._emit({ type: "CONNECTION_STATUS", status: "error" });
        this._scheduleReconnect();
      };
    } catch (e) {
      this._emit({ type: "CONNECTION_STATUS", status: "error" });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentDelay = Math.min(
        this.currentDelay * 2,
        this.maxReconnectDelay,
      );
      if (this.url) this.connect(this.url);
    }, this.currentDelay);
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
        /* ignore listener errors */
      }
    });
  }
}

export const sseService = new SseService();
export default sseService;
