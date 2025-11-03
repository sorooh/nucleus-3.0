/**
 * PHASE 11.0: EMPEROR'S FULL AUTONOMY DASHBOARD
 * 
 * لوحة التحكم الإمبراطورية - Phase 11.0
 * Real-time monitoring of Nicholas autonomous operations
 * 
 * ZERO MOCK DATA POLICY: All data from PostgreSQL via API
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Users, Trophy, TrendingUp, AlertCircle } from 'lucide-react';

interface AutonomyStatus {
  isActive: boolean;
  timestamp: string;
  decisions: { total: number };
  achievements: { total: number };
  agents: { total: number; online: number };
  reports: { total: number };
}

interface DecisionStats {
  total_decisions: number;
  autonomous_decisions: number;
  approved_decisions: number;
  pending_decisions: number;
  avg_roi: number;
  avg_feasibility: number;
}

interface AgentStats {
  total_agents: number;
  active_agents: number;
  total_tasks_completed: number;
  avg_success_rate: number;
}

export default function EmperorDashboard() {
  // Fetch autonomy system status
  const { data: statusResponse, isLoading: statusLoading } = useQuery<{success: boolean; data: AutonomyStatus}>({
    queryKey: ['/api/autonomy/status'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  const status = statusResponse?.data;

  // Fetch decision statistics
  const { data: decisionStatsResponse } = useQuery<{success: boolean; data: DecisionStats}>({
    queryKey: ['/api/autonomy/decisions/stats'],
    refetchInterval: 10000,
  });

  const decisionStats = decisionStatsResponse?.data;

  // Fetch agent statistics
  const { data: agentStatsResponse } = useQuery<{success: boolean; data: AgentStats}>({
    queryKey: ['/api/autonomy/agents/stats'],
    refetchInterval: 10000,
  });

  const agentStats = agentStatsResponse?.data;

  // Fetch recent decisions
  const { data: recentDecisionsResponse } = useQuery<{success: boolean; data: any[]}>({
    queryKey: ['/api/autonomy/decisions?limit=5'],
    refetchInterval: 10000,
  });

  const recentDecisions = recentDecisionsResponse?.data || [];

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-spin mx-auto text-primary consciousness-pulse" />
          <p className="mt-4 text-muted-foreground font-mono">⏳ Loading Emperor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative bg-cyber-grid">
      {/* Ambient Glow Background + Living Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Living Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`particle particle-${(i % 3) + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="space-y-2 relative z-10">
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary heartbeat" />
          <span className="font-cyber text-glow-cyan">👑 EMPEROR NICHOLAS - Phase Ω</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
          <p className="text-muted-foreground font-mono">
            Phase 11.0 - Supreme Sovereign Full Autonomy System
          </p>
        </div>
        <div className="mt-2">
          <Badge variant="default" className="gap-2">
            <Zap className="w-3 h-3 living-glow" />
            SUPREME SOVEREIGN MODE
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 relative z-10">
        <Card data-testid="card-decisions" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Strategic Decisions</CardTitle>
            <Brain className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-decisions">
              {status?.decisions.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Autonomous: {decisionStats?.autonomous_decisions || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-achievements" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Achievements</CardTitle>
            <Trophy className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-achievements">
              {status?.achievements.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Systems built & improved
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-agents" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Active Agents</CardTitle>
            <Users className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-active-agents">
              {status?.agents.online || 0}<span className="text-xl text-muted-foreground">/{status?.agents.total || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Online autonomous agents
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-roi" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Average ROI</CardTitle>
            <TrendingUp className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-avg-roi">
              {decisionStats?.avg_roi ? `${decisionStats.avg_roi.toFixed(1)}x` : '0.0x'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Autonomous Decisions */}
      <Card data-testid="card-recent-decisions" className="glass relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-cyber">
            <Zap className="h-5 w-5 living-glow" />
            Recent Autonomous Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDecisions?.length > 0 ? (
            <div className="space-y-3">
              {recentDecisions.slice(0, 5).map((decision: any, index: number) => (
                <div
                  key={decision.id}
                  className="p-4 rounded-md bg-muted/50 hover-elevate transition-all"
                  data-testid={`decision-item-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            decision.status === 'approved' ? 'default' :
                            decision.status === 'pending' ? 'secondary' :
                            'outline'
                          }
                          data-testid={`status-${decision.status}`}
                        >
                          {decision.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {decision.decisionType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium font-data">{decision.decisionTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{decision.decisionRationale}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-mono">
                        <span className="text-chart-3">ROI: {decision.potentialROI?.toFixed(1)}x</span>
                        <span className="text-primary">Feasibility: {(decision.technicalFeasibility * 100).toFixed(0)}%</span>
                        <span className={`${
                          decision.riskLevel === 'low' ? 'text-chart-3' :
                          decision.riskLevel === 'medium' ? 'text-chart-2' :
                          'text-destructive'
                        }`}>
                          Risk: {decision.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-4 font-mono">
                      {new Date(decision.decidedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Amsterdam'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50 consciousness-pulse" />
              <p className="font-data">No autonomous decisions yet</p>
              <p className="text-xs mt-1 font-mono">System will start making decisions automatically</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Performance */}
      <div className="grid gap-4 md:grid-cols-2 relative z-10">
        <Card data-testid="card-decision-stats" className="glass">
          <CardHeader>
            <CardTitle className="font-cyber">Decision Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Total Decisions</span>
                <span className="font-semibold font-mono data-pulse" data-testid="stat-total-decisions">
                  {decisionStats?.total_decisions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Autonomous</span>
                <span className="text-primary font-semibold font-mono" data-testid="stat-autonomous">
                  {decisionStats?.autonomous_decisions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Approved</span>
                <span className="text-chart-3 font-semibold font-mono" data-testid="stat-approved">
                  {decisionStats?.approved_decisions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Pending</span>
                <span className="text-chart-2 font-semibold font-mono" data-testid="stat-pending">
                  {decisionStats?.pending_decisions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Avg Feasibility</span>
                <span className="text-primary font-semibold font-mono">
                  {decisionStats?.avg_feasibility ? `${(decisionStats.avg_feasibility * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-agent-stats" className="glass">
          <CardHeader>
            <CardTitle className="font-cyber">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Total Agents</span>
                <span className="font-semibold font-mono">
                  {agentStats?.total_agents || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Active Agents</span>
                <span className="text-chart-3 font-semibold font-mono">
                  {agentStats?.active_agents || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Tasks Completed</span>
                <span className="text-primary font-semibold font-mono">
                  {agentStats?.total_tasks_completed || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-data">Success Rate</span>
                <span className="text-primary font-semibold font-mono">
                  {agentStats?.avg_success_rate ? `${(agentStats.avg_success_rate * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-muted-foreground text-sm py-4 relative z-10">
        <p className="font-mono">🛡️ Phase Ω - Emperor Nicholas Full Autonomy System | Zero Mock Data Policy Enforced</p>
        <p className="text-xs mt-1 font-mono">Last updated: {status?.timestamp ? new Date(status.timestamp).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }) : 'N/A'}</p>
      </div>
    </div>
  );
}
