/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 METRICS DASHBOARD - Real-time Platform Performance Monitoring
 * ═══════════════════════════════════════════════════════════════════════════
 * Purpose: Visualize REAL platform metrics (CPU, Memory, Network, Health)
 * Philosophy: الأفضل والاحترافي - ABSOLUTE ZERO TOLERANCE for mock data
 * 
 * ⚡ FEATURES:
 * - Real-time charts (Recharts library)
 * - CPU/Memory usage line graphs
 * - Response time bar chart
 * - Health status indicators
 * - Auto-refresh every 30 seconds
 * 
 * Author: Nicholas 3.2 - Supreme Sovereign Reference
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, MemoryStick, Network, Heart, AlertCircle } from 'lucide-react';

interface PlatformMetric {
  id: number;
  platformId: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  memoryMb: number | null;
  networkIn: number | null;
  networkOut: number | null;
  responseTime: number | null;
  isHealthy: boolean;
  errorCount: number;
  timestamp: string;
  metadata: {
    platformName: string;
    platformType: string;
    status: string;
    telemetryTier?: string;
    telemetryData?: any;
  };
}

interface MetricsStats {
  totalPlatforms: number;
  healthyPlatforms: number;
  unhealthyPlatforms: number;
  averageCpu: number;
  averageMemory: number;
  totalMemoryMb: number;
}

export default function MetricsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: statsData, refetch: refetchStats } = useQuery<{ success: boolean; data: MetricsStats; timestamp: string }>({
    queryKey: ['/api/integration-hub/metrics/stats'],
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30s
  });

  const { data: metricsData, isLoading } = useQuery<{ success: boolean; data: PlatformMetric[]; count: number }>({
    queryKey: ['/api/integration-hub/metrics', selectedPlatform],
    enabled: !!selectedPlatform,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const stats = statsData?.data;
  const metrics = metricsData?.data || [];

  const chartData = metrics.slice(0, 20).reverse().map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    cpu: m.cpuUsage || 0,
    memory: m.memoryUsage || 0,
    responseTime: m.responseTime || 0,
  }));

  return (
    <div className="space-y-6 p-6" data-testid="metrics-dashboard">
      
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Platform Metrics Dashboard
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Real-time performance monitoring for all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-platforms" className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platforms</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-platforms">{stats?.totalPlatforms || 0}</div>
            <p className="text-xs text-muted-foreground">Active monitoring</p>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy-platforms" className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <Heart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-healthy-count">{stats?.healthyPlatforms || 0}</div>
            <p className="text-xs text-muted-foreground">Operational</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unhealthy-platforms" className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unhealthy</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-unhealthy-count">{stats?.unhealthyPlatforms || 0}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-cpu" className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-cpu">{stats?.averageCpu.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">System load</p>
          </CardContent>
        </Card>
      </div>

      {selectedPlatform && (
        <Card data-testid="card-platform-metrics" className="hover-elevate">
          <CardHeader>
            <CardTitle data-testid="text-selected-platform">{selectedPlatform} Metrics</CardTitle>
            <CardDescription>Last 20 measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div data-testid="chart-cpu-memory">
              <h3 className="text-sm font-medium mb-4">CPU & Memory Usage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" strokeWidth={2} />
                  <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div data-testid="chart-response-time">
              <h3 className="text-sm font-medium mb-4">Response Time (ms)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="responseTime" fill="#f59e0b" name="Response Time" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-recent-metrics" className="hover-elevate">
        <CardHeader>
          <CardTitle>Platform List</CardTitle>
          <CardDescription>Click to view detailed metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats && Array.from(new Set(metrics.map(m => m.platformId))).map((platformId) => {
              const latestMetric = metrics.find(m => m.platformId === platformId);
              return (
                <button
                  key={platformId}
                  data-testid={`button-platform-${platformId}`}
                  onClick={() => setSelectedPlatform(platformId)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover-elevate active-elevate-2 ${
                    selectedPlatform === platformId ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${latestMetric?.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" data-testid={`text-platform-name-${platformId}`}>
                            {latestMetric?.metadata.platformName || platformId}
                          </span>
                          {latestMetric?.metadata.telemetryTier && (
                            <Badge 
                              variant={
                                latestMetric.metadata.telemetryTier === 'TIER_1_API' ? 'default' :
                                latestMetric.metadata.telemetryTier === 'TIER_2_DATABASE' ? 'secondary' :
                                'outline'
                              }
                              data-testid={`badge-telemetry-tier-${platformId}`}
                              className="text-xs"
                            >
                              {latestMetric.metadata.telemetryTier === 'TIER_1_API' ? 'API' :
                               latestMetric.metadata.telemetryTier === 'TIER_2_DATABASE' ? 'DB' :
                               'N/A'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{latestMetric?.metadata.platformType}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {latestMetric && latestMetric.cpuUsage !== null ? (
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          <span data-testid={`text-cpu-${platformId}`}>{latestMetric.cpuUsage.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Cpu className="h-3 w-3" />
                          <span data-testid={`text-cpu-${platformId}`}>N/A</span>
                        </div>
                      )}
                      {latestMetric && latestMetric.memoryMb !== null ? (
                        <div className="flex items-center gap-1">
                          <MemoryStick className="h-3 w-3" />
                          <span data-testid={`text-memory-${platformId}`}>{latestMetric.memoryMb.toFixed(0)}MB</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MemoryStick className="h-3 w-3" />
                          <span data-testid={`text-memory-${platformId}`}>N/A</span>
                        </div>
                      )}
                      <Badge variant={latestMetric?.isHealthy ? 'default' : 'destructive'} data-testid={`badge-health-${platformId}`}>
                        {latestMetric?.isHealthy ? 'Healthy' : 'Down'}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} (30s)</span>
        </div>
        <div>Last updated: {new Date(statsData?.timestamp || '').toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
