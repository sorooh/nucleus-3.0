import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Zap } from "lucide-react";

type LiveEvent =
  | { type: "WS_CONNECTED" }
  | { type: "NICHOLAS_READY" }
  | { type: "NICHOLAS_SAFE_MODE"; error?: string }
  | { type: "AUDIT_COMPLETED"; payload: any };

export default function NicholasAudit() {
  const [status, setStatus] = useState<"idle"|"ready"|"safe"|"audited">("idle");
  const [lastReport, setLastReport] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    
    ws.onmessage = (m) => {
      try {
        const ev: LiveEvent = JSON.parse(m.data);
        if (ev.type === "WS_CONNECTED") setStatus("idle");
        if (ev.type === "NICHOLAS_READY") setStatus("ready");
        if (ev.type === "NICHOLAS_SAFE_MODE") setStatus("safe");
        if (ev.type === "AUDIT_COMPLETED") {
          setStatus("audited");
          setLastReport(ev.payload);
        }
      } catch {}
    };
    
    ws.onclose = () => (wsRef.current = null);
    return () => ws.close();
  }, []);

  const truth = lastReport?.truth;
  const summary = useMemo(() => {
    if (!truth) return null;
    const total = truth?.detailedFindings?.length || 0;
    const fake = truth?.detailedFindings?.filter((f: any) => f?.isFake).length || 0;
    return { total, fake, score: Math.round((truth?.realityScore || 0) * 100) };
  }, [truth]);

  const runAudit = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/nicholas/audit/run", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: "{}" 
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Audit failed");
      setLastReport(data.report);
      setStatus("audited");
    } catch (e) {
      alert(String(e));
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = () => {
    if (status === "ready") return "bg-green-500/20 text-green-400 border-green-500/50";
    if (status === "safe") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    if (status === "audited") return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
    return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-2 h-8 bg-cyan-400 rounded-full animate-pulse" />
              Nicholas — Fraud & Illusion Detection
            </h1>
            <p className="text-gray-400">Autonomous lie detection + intelligent auto-repair system</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor()} data-testid="status-badge">
              {status.toUpperCase()}
            </Badge>
            <Button
              onClick={runAudit}
              disabled={running}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              data-testid="button-run-audit"
            >
              {running ? "Running..." : "Run Full Audit"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-cyan-950/50 to-cyan-900/20 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-cyan-500/20 hover:shadow-lg" data-testid="card-reality-score">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-cyan-300 flex items-center justify-between">
                  <span>Reality Score</span>
                  <TrendingUp className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2" data-testid="text-reality-score">
                  {summary.score}<span className="text-2xl text-cyan-400">%</span>
                </div>
                <p className="text-xs text-cyan-300/70">System authenticity level</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-950/50 to-green-900/20 border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-green-500/20 hover:shadow-lg" data-testid="card-findings">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-300 flex items-center justify-between">
                  <span>Total Findings</span>
                  <CheckCircle2 className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2" data-testid="text-total-findings">
                  {summary.total}
                </div>
                <p className="text-xs text-green-300/70">Detection points analyzed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-950/50 to-red-900/20 border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:shadow-red-500/20 hover:shadow-lg" data-testid="card-fake-detected">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-300 flex items-center justify-between">
                  <span>Fake/Illusion Detected</span>
                  <XCircle className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2" data-testid="text-fake-count">
                  {summary.fake}
                </div>
                <p className="text-xs text-red-300/70">Fraudulent patterns found</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Findings */}
        {truth?.detailedFindings?.length > 0 && (
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Detailed Findings
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                  {truth.detailedFindings.length} checks
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {truth.detailedFindings.map((f: any, i: number) => (
                  <div
                    key={i}
                    className="group bg-gradient-to-r from-gray-950/50 to-gray-900/30 border border-gray-700/50 rounded-lg p-4 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
                    data-testid={`finding-${i}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{f.type || "UNKNOWN"}</div>
                      <Badge className={f.isFake ? "bg-red-500/30 text-red-200 border-red-500/50" : "bg-green-500/30 text-green-200 border-green-500/50"}>
                        {f.isFake ? "FAKE" : "REAL"}
                      </Badge>
                    </div>
                    {f.description && <p className="mt-2 text-sm text-gray-300">{f.description}</p>}
                    {f.evidence && Array.isArray(f.evidence) && f.evidence.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm underline text-cyan-400">Evidence</summary>
                        <ul className="list-disc pl-6 text-sm mt-2 text-gray-400">
                          {f.evidence.map((e: string, idx: number) => <li key={idx}>{e}</li>)}
                        </ul>
                      </details>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Confidence: {Math.round(f.confidence * 100)}%</span>
                      <span>•</span>
                      <span>Severity: {f.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auto-Repair Proposals */}
        {lastReport?.repairs?.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-900/80 to-purple-800/50 border-purple-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Auto-Repair Proposals
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                  {lastReport.repairs.length} proposals
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {lastReport.repairs.map((r: any, i: number) => (
                  <div key={i} className="rounded-lg border border-purple-700/50 bg-purple-950/30 p-4" data-testid={`repair-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-white">{r?.finding?.type || "UNKNOWN"}</div>
                      {r?.proposal?.autoApplicable ? (
                        <Badge className="bg-green-500/30 text-green-200 border-green-500/50">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Auto-Applicable
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/30 text-yellow-200 border-yellow-500/50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Manual Review
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{r?.finding?.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">Action:</span> {r?.proposal?.recommendedAction || "N/A"}
                      </div>
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">Risk Level:</span> {((r?.proposal?.riskAssessment?.riskLevel || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">Confidence:</span> {((r?.proposal?.confidence || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">Affected:</span> {r?.proposal?.riskAssessment?.affectedComponents?.length || 0} components
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Verdict */}
        {truth && (
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">System Verdict</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400 mb-2">{truth.overallVerdict}</div>
              <p className="text-gray-400 mb-4">
                Overall confidence: {Math.round(truth.confidence * 100)}% • 
                Lies detected: {truth.liesDetected}
              </p>
              {truth.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2">Recommendations:</h4>
                  <ul className="list-disc pl-6 text-sm text-gray-300 space-y-1">
                    {truth.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
