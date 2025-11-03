/**
 * PERFORMANCE DASHBOARD
 * Phase 8.7 → 9.6: Evolution & Monitoring
 * 
 * Real-time visualization of:
 * - Nucleus fitness scores
 * - Evolution runs history
 * - Pending improvements
 * - System metrics
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function PerformanceMonitoring() {
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);

  // Fetch engine status
  const { data: statusData } = useQuery({
    queryKey: ['/api/evolution-monitoring/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch recent runs
  const { data: runsData } = useQuery({
    queryKey: ['/api/evolution-monitoring/runs'],
    refetchInterval: 10000,
  });

  // Fetch pending improvements
  const { data: improvementsData } = useQuery({
    queryKey: ['/api/evolution-monitoring/improvements/pending'],
    refetchInterval: 10000,
  });

  const status = statusData?.data;
  const stats = status?.stats;
  const runs = runsData?.data || [];
  const improvements = improvementsData?.data || [];

  const handleStartEngine = async () => {
    setIsStarting(true);
    try {
      await apiRequest('/api/evolution-monitoring/start', {
        method: 'POST',
      });
      toast({
        title: 'Engine Started',
        description: 'Evolution & Monitoring Engine is now active',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evolution-monitoring/status'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopEngine = async () => {
    try {
      await apiRequest('/api/evolution-monitoring/stop', {
        method: 'POST',
      });
      toast({
        title: 'Engine Stopped',
        description: 'Evolution & Monitoring Engine has been stopped',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evolution-monitoring/status'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTriggerRun = async () => {
    try {
      await apiRequest('/api/evolution-monitoring/run', {
        method: 'POST',
        body: { runType: 'triggered' },
      });
      toast({
        title: 'Evolution Cycle Started',
        description: 'A new evolution cycle has been triggered',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evolution-monitoring/runs'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-pink-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getFitnessColor = (fitness: number) => {
    if (fitness >= 80) return 'text-emerald-400';
    if (fitness >= 60) return 'text-cyan-400';
    if (fitness >= 40) return 'text-yellow-400';
    return 'text-pink-400';
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Evolution & Monitoring
            </h1>
            <p className="text-gray-400">Phase 8.7 → 9.6: Continuous Learning from Operations</p>
          </div>

          <div className="flex gap-3">
            {status?.isActive ? (
              <Button
                onClick={handleStopEngine}
                variant="outline"
                className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                data-testid="button-stop-engine"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop Engine
              </Button>
            ) : (
              <Button
                onClick={handleStartEngine}
                disabled={isStarting}
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                data-testid="button-start-engine"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start Engine'}
              </Button>
            )}

            <Button
              onClick={handleTriggerRun}
              variant="default"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
              data-testid="button-trigger-run"
            >
              <Activity className="w-4 h-4 mr-2" />
              Trigger Run
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <Card className="bg-gray-900/50 border-cyan-500/30 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Engine Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                  <span className="font-mono text-lg">
                    {status?.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Total Runs</p>
                <p className="font-mono text-2xl text-cyan-400" data-testid="text-total-runs">
                  {stats?.totalRuns || 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Average Fitness</p>
                <p className={`font-mono text-2xl ${getFitnessColor(stats?.averageFitness || 0)}`} data-testid="text-avg-fitness">
                  {stats?.averageFitness?.toFixed(1) || '0.0'}/100
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Pending Improvements</p>
                <p className="font-mono text-2xl text-purple-400" data-testid="text-pending-improvements">
                  {stats?.pendingImprovements || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Evolution Runs */}
        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400">Evolution Runs</CardTitle>
            <CardDescription>Recent evolution cycles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {runs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No evolution runs yet</p>
              ) : (
                runs.slice(0, 10).map((run: any) => (
                  <div
                    key={run.id}
                    className="bg-black/50 border border-gray-800 rounded-lg p-4 hover-elevate"
                    data-testid={`run-${run.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                          {run.status}
                        </Badge>
                        <span className="text-sm text-gray-400">{run.runType}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(run.startedAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Metrics</p>
                        <p className="font-mono text-cyan-400">{run.metricsCollected || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Fitness</p>
                        <p className={`font-mono ${getFitnessColor(parseFloat(run.fitnessScoreAvg || 0))}`}>
                          {run.fitnessScoreAvg || '0.0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Improvements</p>
                        <p className="font-mono text-purple-400">{run.improvementsProposed || 0}</p>
                      </div>
                    </div>

                    {run.duration && (
                      <div className="mt-2 text-xs text-gray-500">
                        Duration: {(run.duration / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Improvements */}
        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400">Pending Improvements</CardTitle>
            <CardDescription>Proposed optimizations awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {improvements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending improvements</p>
              ) : (
                improvements.map((improvement: any) => (
                  <div
                    key={improvement.id}
                    className="bg-black/50 border border-gray-800 rounded-lg p-4 hover-elevate"
                    data-testid={`improvement-${improvement.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {improvement.safetyLevel}
                      </Badge>
                      <span className="text-xs text-gray-500">{improvement.targetNucleus}</span>
                    </div>

                    <h4 className="font-semibold text-gray-100 mb-1">{improvement.title}</h4>
                    <p className="text-sm text-gray-400 mb-3">{improvement.description}</p>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Expected: {improvement.expectedImpact}</span>
                      <Badge variant="outline" className="text-xs">
                        {improvement.actionType}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan lines effect */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="scan-lines" />
      </div>
    </div>
  );
}
