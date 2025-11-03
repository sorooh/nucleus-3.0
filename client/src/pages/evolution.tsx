import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Activity, Brain, GitBranch, ShieldCheck, TrendingUp, Zap, Play, Pause, Square, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EvolutionStatus {
  success: boolean;
  status: {
    isRunning: boolean;
    currentCycle: string | null;
    latestCycleNumber: number;
    latestCycle?: EvolutionCycle | null;
  };
}

interface EvolutionCycle {
  id: string;
  cycleNumber: number;
  startedAt: string;
  completedAt?: string;
  status: string;
  observationsCount: number;
  mutationsGenerated: number;
  mutationsApproved: number;
}

interface EvolutionStatistics {
  success: boolean;
  statistics: {
    totalCycles: number;
    totalMutations: number;
    approvedMutations: number;
    successRate: string;
    systemStatus: string;
    empireFitness?: number;
  };
}

interface EvolutionCycles {
  success: boolean;
  cycles: EvolutionCycle[];
}

interface EvolutionHistoryRecord {
  id: string;
  cycleId: string;
  mutationType: string;
  description: string;
  fitnessScore: number;
  status: string;
  approvedAt?: string;
  blockchainHash: string;
}

interface EvolutionHistory {
  success: boolean;
  history: EvolutionHistoryRecord[];
}

interface Mutation {
  id: string;
  mutationType: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface Mutations {
  success: boolean;
  mutations: Mutation[];
}

interface EmpireFitness {
  success: boolean;
  data: {
    overall: number;
    technical: number;
    business: number;
    experience: number;
    innovation: number;
    breakdown: {
      performance: number;
      reliability: number;
      scalability: number;
      security: number;
    };
  };
}

export default function EvolutionPage() {
  const { toast } = useToast();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery<EvolutionStatus>({
    queryKey: ['/api/evolution/status'],
    refetchInterval: 10000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<EvolutionStatistics>({
    queryKey: ['/api/evolution/statistics'],
  });

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery<EvolutionCycles>({
    queryKey: ['/api/evolution/cycles'],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<EvolutionHistory>({
    queryKey: ['/api/evolution/history'],
  });

  const { data: mutationsData, isLoading: mutationsLoading } = useQuery<Mutations>({
    queryKey: ['/api/evolution/mutations'],
  });

  const { data: empireFitnessData } = useQuery<EmpireFitness>({
    queryKey: ['/api/evolution-monitoring/empire-fitness'],
    refetchInterval: 60000,
  });

  const isLoading = statusLoading || statsLoading;

  const startScheduler = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/evolution/scheduler/start', 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Evolution Scheduler Started",
        description: "Autonomous evolution cycles will run every 24 hours",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evolution/status'] });
      setShowStartDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Scheduler",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const stopScheduler = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/evolution/scheduler/stop', 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Evolution Scheduler Stopped",
        description: "Autonomous evolution cycles have been paused",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evolution/status'] });
      setShowStopDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Scheduler",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6 relative bg-cyber-grid">
      {/* Ambient Glow Background + Living Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary heartbeat" />
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight font-cyber text-glow-cyan" data-testid="text-evolution-title">
                Phase Ω: Evolutionary Intelligence
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
                <p className="text-muted-foreground font-mono text-sm">
                  Self-modifying AI system with autonomous code evolution
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant={statusData?.status?.isRunning ? "default" : "secondary"}
              className="text-sm flex items-center gap-1 living-glow"
              data-testid="badge-evolution-status"
            >
              {statusData?.status?.isRunning ? (
                <><Play className="w-3 h-3" /> Active</>
              ) : (
                <><Pause className="w-3 h-3" /> Idle</>
              )}
            </Badge>

            {statusData?.status?.isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowStopDialog(true)}
                disabled={stopScheduler.isPending}
                data-testid="button-stop-scheduler"
              >
                <Square className="w-4 h-4 mr-2" />
                {stopScheduler.isPending ? "Stopping..." : "Stop Scheduler"}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowStartDialog(true)}
                disabled={startScheduler.isPending}
                data-testid="button-start-scheduler"
              >
                <Play className="w-4 h-4 mr-2" />
                {startScheduler.isPending ? "Starting..." : "Start Scheduler"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Empire Fitness Score */}
      <Card className="glass breathing hover-elevate transition-all relative z-10" data-testid="card-empire-fitness">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 consciousness-pulse" />
            <span className="font-cyber">Empire-wide Fitness Score</span>
          </CardTitle>
          <CardDescription>
            Overall performance health across all nuclei
          </CardDescription>
        </CardHeader>
        <CardContent>
          {empireFitnessData?.data ? (
            <div className="grid md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold data-pulse text-primary" data-testid="text-overall-fitness">
                  {empireFitnessData.data.overall.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Overall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">{empireFitnessData.data.technical.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">Technical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">{empireFitnessData.data.business.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">Business</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">{empireFitnessData.data.experience.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">Experience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">{empireFitnessData.data.innovation.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">Innovation</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Loading empire fitness data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <Card data-testid="card-total-cycles" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Total Cycles</CardTitle>
            <Activity className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-cycles">
              {statsData?.statistics?.totalCycles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Evolution iterations
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-mutations" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Total Mutations</CardTitle>
            <GitBranch className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-mutations">
              {statsData?.statistics?.totalMutations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Code improvements proposed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-approved-mutations" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Approved</CardTitle>
            <ShieldCheck className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-600 data-pulse" data-testid="text-approved-mutations">
              {statsData?.statistics?.approvedMutations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Passed safety & ethics
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Success Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-success-rate">
              {statsData?.statistics?.successRate || "0.0"}%
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Approval percentage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4 relative z-10">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="cycles" data-testid="tab-cycles">Cycles</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="mutations" data-testid="tab-mutations">Mutations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 w-5 heartbeat" />
                <span className="font-cyber">System Status</span>
              </CardTitle>
              <CardDescription>
                Current state of the Evolutionary Intelligence system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">System State:</span>
                    <Badge variant={statusData?.status?.isRunning ? "default" : "secondary"}>
                      {statusData?.status?.isRunning ? "Running" : "Idle"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Cycle:</span>
                    <span className="text-sm" data-testid="text-current-cycle">
                      {statusData?.status?.currentCycle || "None"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Latest Cycle Number:</span>
                    <span className="text-sm" data-testid="text-latest-cycle-number">
                      {statusData?.status?.latestCycleNumber || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">System Status:</span>
                    <Badge variant="outline">
                      {statsData?.statistics?.systemStatus || "Unknown"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-cyber">How Evolutionary Intelligence Works</CardTitle>
              <CardDescription>
                Three-phase autonomous evolution cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center consciousness-pulse">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Observe</h4>
                    <p className="text-sm text-muted-foreground">
                      System analyzes metrics, identifies bottlenecks, and detects areas for improvement
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center consciousness-pulse">
                    <span className="text-sm font-bold text-chart-2">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Mutate</h4>
                    <p className="text-sm text-muted-foreground">
                      AI Committee (Hunyuan, GPT-4, Claude) generates code improvements and optimizations
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chart-3/20 flex items-center justify-center consciousness-pulse">
                    <span className="text-sm font-bold text-chart-3">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Reinforce</h4>
                    <p className="text-sm text-muted-foreground">
                      Sandbox testing validates mutations with safety checks, ethical evaluation, and fitness scoring
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cycles Tab */}
        <TabsContent value="cycles">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-cyber">Evolution Cycles</CardTitle>
              <CardDescription>
                Historical record of all evolution cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cyclesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading cycles...</div>
              ) : cyclesData?.cycles?.length ? (
                <div className="space-y-2">
                  {cyclesData.cycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="p-3 border rounded-lg hover-elevate transition-all glass"
                      data-testid={`cycle-${cycle.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Cycle #{cycle.cycleNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(cycle.startedAt), { addSuffix: true })}
                          </div>
                        </div>
                        <Badge variant={cycle.status === 'completed' ? 'default' : 'secondary'}>
                          {cycle.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No evolution cycles yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-cyber">Evolution History</CardTitle>
              <CardDescription>
                Blockchain ledger of all approved mutations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
              ) : historyData?.history?.length ? (
                <div className="space-y-2">
                  {historyData.history.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 border rounded-lg hover-elevate transition-all glass"
                      data-testid={`history-${record.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{record.mutationType}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {record.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            Fitness: {record.fitnessScore}/100
                          </div>
                        </div>
                        <Badge variant={record.status === 'approved' ? 'default' : 'secondary'}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No evolution history yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mutations Tab */}
        <TabsContent value="mutations">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-cyber">Mutation Queue</CardTitle>
              <CardDescription>
                Pending mutations awaiting sandbox testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mutationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading mutations...</div>
              ) : mutationsData?.mutations?.length ? (
                <div className="space-y-2">
                  {mutationsData.mutations.map((mutation) => (
                    <div
                      key={mutation.id}
                      className="p-3 border rounded-lg hover-elevate transition-all glass"
                      data-testid={`mutation-${mutation.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{mutation.mutationType}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {mutation.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            Priority: {mutation.priority}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {mutation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending mutations
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Scheduler Confirmation Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Start Evolutionary Intelligence?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will activate the autonomous evolution system. Surooh will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Analyze system performance every 24 hours</li>
                <li>Generate AI-powered code improvements</li>
                <li>Test mutations in isolated sandbox</li>
                <li>Apply changes after safety verification</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                All mutations are subject to strict safety, ethical, and performance checks.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-start">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startScheduler.mutate()}
              disabled={startScheduler.isPending}
              data-testid="button-confirm-start"
            >
              {startScheduler.isPending ? "Starting..." : "Start Evolution"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop Scheduler Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Evolutionary Intelligence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause all autonomous evolution cycles. The system will remain idle until manually restarted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-stop">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => stopScheduler.mutate()}
              disabled={stopScheduler.isPending}
              data-testid="button-confirm-stop"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {stopScheduler.isPending ? "Stopping..." : "Stop Scheduler"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
