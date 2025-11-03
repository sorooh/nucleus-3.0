import { useEffect, useRef, useState } from "react";

// Live list of recently detected problems + repair progress (consumes /ws)
type LiveEvent =
  | { type: "WS_CONNECTED" }
  | { type: "NEW_PROBLEM"; problem: any }
  | { type: "REPAIR_PROGRESS"; problemId: string; progress: { status: "pending"|"in_progress"|"completed"|"failed"; percent?: number } }
  | { type: "AUDIT_COMPLETED"; payload: any };

export const LiveAuditDashboard = () => {
  const [problems, setProblems] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = (typeof window !== "undefined")
      ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`
      : "";
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (m) => {
      try {
        const ev: LiveEvent = JSON.parse(m.data);
        if (ev.type === "NEW_PROBLEM") {
          setProblems((prev) => [ev.problem, ...prev].slice(0, 200));
        }
        if (ev.type === "REPAIR_PROGRESS") {
          setProgress((p) => ({ ...p, [ev.problemId]: ev.progress }));
        }
        if (ev.type === "AUDIT_COMPLETED") {
          // optional toast / banner
        }
      } catch {}
    };
    ws.onclose = () => (wsRef.current = null);
    return () => ws.close();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Live Audit Feed</h2>

      <section className="rounded border p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {problems.map((p, i) => (
            <div key={p?.id || i} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p?.type || "UNKNOWN"}</div>
                <span className="text-xs px-2 py-1 rounded bg-red-600 text-white">
                  {p?.severity || "ISSUE"}
                </span>
              </div>
              <div className="text-sm opacity-80 mt-1">{p?.description}</div>
              {p?.affectedFiles?.length ? (
                <details className="mt-2">
                  <summary className="text-sm underline cursor-pointer">Affected files</summary>
                  <ul className="list-disc pl-6 text-sm mt-2">
                    {p.affectedFiles.map((f: string, idx: number) => <li key={idx}>{f}</li>)}
                  </ul>
                </details>
              ) : null}
              {/* progress */}
              <div className="text-xs mt-2">
                <strong>Repair:</strong>{" "}
                {progress[p.id]?.status || "pending"} {progress[p.id]?.percent ? `(${progress[p.id]?.percent}%)` : ""}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
