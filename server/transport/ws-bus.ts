import { Server } from "http";
import WebSocket, { WebSocketServer } from "ws";

const clients = new Set<WebSocket>();

export const wsBus = {
  broadcast(payload: unknown) {
    const message = JSON.stringify(payload);
    for (const c of clients) {
      try {
        if (c.readyState === WebSocket.OPEN) {
          c.send(message);
        }
      } catch (error) {
        console.error("WS broadcast error:", error);
      }
    }
  },
};

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.send(JSON.stringify({ type: "WS_CONNECTED" }));
  });

  console.log("✅ WebSocket server ready at /ws");
}
