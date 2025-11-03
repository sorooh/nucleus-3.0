import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Zap, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Target,
  Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================
// Types
// ============================================

interface GovernanceDecision {
  id: string;
  action: string;
  targetContext: string;
  ethicsScore: number;
  impactScore: number;
  riskScore: number;
  alignmentScore: number;
  isApproved: boolean;
  aiConsensus: number;
  aiConfidence: number;
  executionResult: string | null;
  executionNotes: string | null;
  createdAt: string;
}

interface CycleSummary {
  totalCycles: number;
  decisionsApproved: number;
  decisionsRejected: number;
  actionsExecuted: number;
  successRate: number;
  avgConfidence: number;
  avgAlignmentScore: number;
}

// ============================================
// Supreme Dashboard
// ============================================

export default function SupremeDashboard() {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);

  // Fetch recent governance decisions
  const { data: decisions = [], isLoading: decisionsLoading } = useQuery<GovernanceDecision[]>({
    queryKey: ['/api/governance/decisions'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch cycle summary
  const { data: summary, isLoading: summaryLoading } = useQuery<CycleSummary>({
    queryKey: ['/api/governance/summary'],
    refetchInterval: 10000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Supreme Autonomous Core
                </h1>
                <p className="text-muted-foreground text-sm">
                  Phase Ω.SUPREME - AI-Powered Autonomous Intelligence
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Activity className="w-3 h-3" />
                Live
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Autonomous Cycles
              </CardTitle>
              <Brain className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "..." : summary?.totalCycles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Every 10 minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "..." : `${summary?.successRate.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Approved & Executed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI Confidence
              </CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "..." : `${summary?.avgConfidence.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Average across decisions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Actions Executed
              </CardTitle>
              <Zap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? "..." : summary?.actionsExecuted || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Real autonomous actions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="decisions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="decisions" data-testid="tab-decisions">
              <Brain className="w-4 h-4 mr-2" />
              AI Decisions
            </TabsTrigger>
            <TabsTrigger value="execution" data-testid="tab-execution">
              <Zap className="w-4 h-4 mr-2" />
              Execution History
            </TabsTrigger>
          </TabsList>

          {/* Decisions Tab */}
          <TabsContent value="decisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Recent Autonomous Decisions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {decisionsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="text-muted-foreground">Loading decisions...</div>
                    </div>
                  ) : decisions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                      <Clock className="w-8 h-8 text-muted-foreground" />
                      <div className="text-muted-foreground">Waiting for first autonomous cycle...</div>
                      <div className="text-xs text-muted-foreground">Next cycle in ~10 minutes</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {decisions.map((decision: GovernanceDecision) => (
                        <Card 
                          key={decision.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => setSelectedDecision(decision.id === selectedDecision ? null : decision.id)}
                          data-testid={`decision-${decision.id}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  {decision.isApproved ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  <span className="font-medium">{decision.action}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {decision.targetContext}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Badge variant={decision.isApproved ? "default" : "destructive"}>
                                  {decision.isApproved ? "Approved" : "Rejected"}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(decision.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          {selectedDecision === decision.id && (
                            <CardContent className="pt-0 space-y-4 border-t">
                              {/* AI Metrics */}
                              <div className="grid grid-cols-2 gap-3 pt-3">
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">AI Consensus</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.aiConsensus.toFixed(1)}%</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${decision.aiConsensus}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">AI Confidence</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.aiConfidence.toFixed(1)}%</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500 transition-all"
                                        style={{ width: `${decision.aiConfidence}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Ethics Score</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.ethicsScore.toFixed(2)}</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-green-500 transition-all"
                                        style={{ width: `${decision.ethicsScore * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Impact Score</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.impactScore.toFixed(2)}</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-yellow-500 transition-all"
                                        style={{ width: `${decision.impactScore * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Risk Score</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.riskScore.toFixed(2)}</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-red-500 transition-all"
                                        style={{ width: `${decision.riskScore * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Alignment Score</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{decision.alignmentScore.toFixed(2)}</div>
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-purple-500 transition-all"
                                        style={{ width: `${Math.max(0, Math.min(100, decision.alignmentScore * 100))}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Execution Status */}
                              {decision.executionResult && (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium">Execution Status</div>
                                  <Badge variant={decision.executionResult === 'success' ? 'default' : 'destructive'}>
                                    {decision.executionResult}
                                  </Badge>
                                  {decision.executionNotes && (
                                    <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
                                      {decision.executionNotes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Execution History Tab */}
          <TabsContent value="execution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Execution History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {decisionsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="text-muted-foreground">Loading execution history...</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {decisions.filter((d: GovernanceDecision) => d.executionResult).map((decision: GovernanceDecision) => (
                        <Card key={decision.id} className="hover-elevate">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {decision.executionResult === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : decision.executionResult === 'skipped' ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="font-medium">{decision.action}</span>
                              </div>
                              <Badge variant={
                                decision.executionResult === 'success' ? 'default' : 
                                decision.executionResult === 'skipped' ? 'secondary' : 
                                'destructive'
                              }>
                                {decision.executionResult}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                {decision.targetContext}
                              </div>
                              {decision.executionNotes && (
                                <div className="text-sm bg-secondary/50 p-3 rounded-md">
                                  {decision.executionNotes}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {new Date(decision.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {decisions.filter((d: GovernanceDecision) => d.executionResult).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                          <Zap className="w-8 h-8 text-muted-foreground" />
                          <div className="text-muted-foreground">No executions yet</div>
                          <div className="text-xs text-muted-foreground">
                            Waiting for approved decisions to be executed
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
