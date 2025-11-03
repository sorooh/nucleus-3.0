import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Activity, Users, PlayCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { LiveAuditDashboard } from "@/components/LiveAuditDashboard";
import { ProgrammerStats } from "@/components/ProgrammerStats";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type NicholasHealth = {
  success: boolean;
  nicholasReady: boolean;
  timestamp: string;
};

type AuditReport = {
  success: boolean;
  report: any;
};

export default function NicholasDashboard() {
  const { toast } = useToast();
  const [auditReport, setAuditReport] = useState<any>(null);

  const { data: health } = useQuery<NicholasHealth>({
    queryKey: ["/api/nicholas/health"],
    refetchInterval: 5000,
  });

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/nicholas/audit/run", "POST", {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      setAuditReport(data.report);
      toast({
        title: "Audit Complete",
        description: "Fraud & Illusion Detection scan completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dev-metrics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Audit Failed",
        description: error.message || "Failed to run audit",
        variant: "destructive",
      });
    },
  });

  const isNicholasReady = health?.nicholasReady ?? false;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
            <Shield className="w-8 h-8 text-primary" />
            Nicholas Fraud & Illusion Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            Supreme Sovereign Reference - Zero Tolerance for Fake Data
          </p>
        </div>
        <Button
          onClick={() => runAuditMutation.mutate()}
          disabled={!isNicholasReady || runAuditMutation.isPending}
          size="lg"
          data-testid="button-run-audit"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {runAuditMutation.isPending ? "Running..." : "Run Full Audit"}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card data-testid="card-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nicholas Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isNicholasReady ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" data-testid="icon-status-ready" />
                  <span className="text-2xl font-bold text-green-600">Ready</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-600" data-testid="icon-status-not-ready" />
                  <span className="text-2xl font-bold text-yellow-600">Initializing</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {health?.timestamp ? new Date(health.timestamp).toLocaleString() : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-reality-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reality Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reality-score">
              {auditReport?.truth?.realityScore?.toFixed(1) || "—"}/10
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last audit: {auditReport?.timestamp ? new Date(auditReport.timestamp).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-lies-detected">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lies Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-lies-count">
              {auditReport?.truth?.liesDetected || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Fake UI, Mock API, Static Data
            </p>
          </CardContent>
        </Card>
      </div>

      {auditReport && (
        <Card data-testid="card-audit-report">
          <CardHeader>
            <CardTitle>Latest Audit Report</CardTitle>
            <CardDescription>
              Comprehensive fraud detection results with repair proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Overall Score</div>
                  <div className="text-2xl font-bold" data-testid="text-overall-score">
                    {auditReport.overallScore?.toFixed(1)}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div
                    className={`text-2xl font-bold ${
                      auditReport.passed ? "text-green-600" : "text-red-600"
                    }`}
                    data-testid="text-status"
                  >
                    {auditReport.passed ? "PASSED" : "FAILED"}
                  </div>
                </div>
              </div>

              {auditReport.truth?.detailedFindings?.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Detected Issues</div>
                  <div className="space-y-2">
                    {auditReport.truth.detailedFindings.slice(0, 5).map((finding: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 border rounded-lg"
                        data-testid={`finding-${i}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{finding.type}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              finding.severity === "CRITICAL"
                                ? "bg-red-600 text-white"
                                : finding.severity === "HIGH"
                                ? "bg-orange-500 text-white"
                                : "bg-yellow-500 text-black"
                            }`}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card data-testid="card-live-audit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Audit Feed
            </CardTitle>
            <CardDescription>Real-time fraud detection events</CardDescription>
          </CardHeader>
          <CardContent>
            <LiveAuditDashboard />
          </CardContent>
        </Card>

        <Card data-testid="card-programmer-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Programmer Trust Scores
            </CardTitle>
            <CardDescription>Quality metrics and enforcement status</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgrammerStats />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
