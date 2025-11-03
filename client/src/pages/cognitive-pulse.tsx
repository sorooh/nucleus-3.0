import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  Eye
} from "lucide-react";

interface GovernanceStats {
  total: number;
  approved: number;
  blocked: number;
  executed: number;
  pending: number;
  averageScores: {
    ethics: number;
    impact: number;
    risk: number;
    alignment: number;
  };
  last24Hours: number;
}

interface Decision {
  id: string;
  action: string;
  description: string;
  approved: number;
  ethicsScore: number;
  impactScore: number;
  riskScore: number;
  alignmentScore: number;
  createdAt: string;
}

interface Pulse {
  timestamp: string;
  integrity: {
    cycleNumber: number;
    autonomyScore: string;
    overallStatus: string;
    fakeModulesCount: number;
    repairedModulesCount: number;
  } | null;
  governance: {
    recentDecisions: Decision[];
    totalPending: number;
  };
  evolution: {
    pendingSuggestions: number;
  };
  status: string;
}

export default function CognitivePulse() {
  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; data: GovernanceStats }>({
    queryKey: ['/api/omega9/governance/stats'],
    refetchInterval: 30000,
  });

  const { data: pulse, isLoading: pulseLoading } = useQuery<{ success: boolean; data: Pulse }>({
    queryKey: ['/api/omega9/governance/pulse'],
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'critical': return <XCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (statsLoading || pulseLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">النبض المعرفي</h1>
            <p className="text-muted-foreground">Cognitive Pulse - Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const statusData = stats?.data;
  const pulseData = pulse?.data;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">النبض المعرفي</h1>
            <p className="text-muted-foreground">Cognitive Pulse - Real-time System Awareness</p>
          </div>
        </div>
        
        {pulseData && (
          <div className={`flex items-center gap-2 ${getStatusColor(pulseData.status)}`}>
            {getStatusIcon(pulseData.status)}
            <span className="text-sm font-semibold uppercase">{pulseData.status}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stats-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statusData?.last24Hours || 0} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-approved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{statusData?.approved || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statusData?.total ? ((statusData.approved / statusData.total) * 100).toFixed(1) : 0}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-blocked">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{statusData?.blocked || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ethics/Risk violations
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{statusData?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-score-ethics">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Ethics</CardTitle>
            <Shield className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {(statusData?.averageScores.ethics || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">0-1 scale</p>
          </CardContent>
        </Card>

        <Card data-testid="card-score-impact">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {(statusData?.averageScores.impact || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Benefit value</p>
          </CardContent>
        </Card>

        <Card data-testid="card-score-risk">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {(statusData?.averageScores.risk || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Lower is better</p>
          </CardContent>
        </Card>

        <Card data-testid="card-score-alignment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Alignment</CardTitle>
            <Zap className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">
              {(statusData?.averageScores.alignment || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">(E+I)/2 - R</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrity Status */}
      {pulseData?.integrity && (
        <Card data-testid="card-integrity-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Integrity Status - Cycle #{pulseData.integrity.cycleNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Autonomy Score</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {pulseData.integrity.autonomyScore}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fake Modules</div>
                <div className="text-2xl font-bold text-red-400">
                  {pulseData.integrity.fakeModulesCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Repaired</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {pulseData.integrity.repairedModulesCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Decisions */}
      <Card data-testid="card-recent-decisions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Governance Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pulseData?.governance.recentDecisions.map((decision) => (
              <div
                key={decision.id}
                className="flex items-start gap-4 p-4 border rounded-lg"
                data-testid={`decision-${decision.id}`}
              >
                <div className="flex-shrink-0">
                  {decision.approved ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{decision.action}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {decision.description}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span>Ethics: <strong className="text-blue-400">{decision.ethicsScore.toFixed(2)}</strong></span>
                    <span>Impact: <strong className="text-purple-400">{decision.impactScore.toFixed(2)}</strong></span>
                    <span>Risk: <strong className="text-orange-400">{decision.riskScore.toFixed(2)}</strong></span>
                    <span>Score: <strong className="text-cyan-400">{decision.alignmentScore.toFixed(2)}</strong></span>
                  </div>
                </div>
                <Badge variant={decision.approved ? "default" : "destructive"} data-testid={`badge-status-${decision.id}`}>
                  {decision.approved ? 'APPROVED' : 'BLOCKED'}
                </Badge>
              </div>
            ))}
            
            {(!pulseData?.governance.recentDecisions || pulseData.governance.recentDecisions.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                No recent decisions
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evolution Suggestions */}
      {pulseData?.evolution && pulseData.evolution.pendingSuggestions > 0 && (
        <Card data-testid="card-evolution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolution Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-purple-400">
                {pulseData.evolution.pendingSuggestions}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Pending suggestions for system improvement
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
