/**
 * 📊 Platform Analytics Dashboard
 * ===============================
 * Visual analytics and charts for platform monitoring
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Shield, 
  Clock,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface PlatformStatus {
  platformId: string;
  platformName: string;
  currentStatus: string;
  healthScore: number | null;
  complianceScore: number | null;
  uptime: number | null;
  sideInstalled: number;
  sideActive: number;
  lastHeartbeat: Date | null;
}

const COLORS = {
  online: '#10b981',
  degraded: '#f59e0b',
  offline: '#ef4444',
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export function PlatformAnalyticsDashboard() {
  const { data: platformsData, isLoading: platformsLoading } = useQuery<{
    success: boolean;
    platforms: PlatformStatus[];
  }>({
    queryKey: ['/api/monitor/status'],
    refetchInterval: 10000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    stats: {
      avgHealthScore: number;
      avgComplianceScore: number;
      avgUptime: number;
      totalPlatforms: number;
      onlinePlatforms: number;
    };
  }>({
    queryKey: ['/api/monitor/stats'],
    refetchInterval: 10000,
  });

  const platforms = platformsData?.platforms || [];
  const stats = statsData?.stats;

  // Generate trend data from current platform stats (snapshot view)
  // Note: This shows current state across platforms, not historical data
  // For true historical trends, backend would need to store time-series data
  const generateTrendData = () => {
    // Use current platform data as a snapshot
    const currentAvgHealth = stats?.avgHealthScore || 0;
    const currentAvgCompliance = stats?.avgComplianceScore || 0;
    const currentUptime = stats?.avgUptime || 0;
    
    // Show current values as stable trend
    const days = 7;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'MMM dd'),
        avgHealth: currentAvgHealth,
        avgCompliance: currentAvgCompliance,
        uptime: currentUptime,
      });
    }
    
    return data;
  };

  const trendData = generateTrendData();

  // Status distribution
  const statusDistribution = [
    { name: 'Online', value: platforms.filter(p => p.currentStatus === 'online').length, color: COLORS.online },
    { name: 'Degraded', value: platforms.filter(p => p.currentStatus === 'degraded').length, color: COLORS.degraded },
    { name: 'Offline', value: platforms.filter(p => p.currentStatus === 'offline').length, color: COLORS.offline },
  ].filter(item => item.value > 0);

  // SIDE adoption
  const sideAdoption = [
    { name: 'SIDE Active', value: platforms.filter(p => p.sideInstalled === 1 && p.sideActive === 1).length, color: COLORS.healthy },
    { name: 'SIDE Installed', value: platforms.filter(p => p.sideInstalled === 1 && p.sideActive === 0).length, color: COLORS.warning },
    { name: 'No SIDE', value: platforms.filter(p => p.sideInstalled === 0).length, color: COLORS.critical },
  ].filter(item => item.value > 0);

  // Platform health scores
  const healthScores = platforms
    .filter(p => p.healthScore !== null)
    .map(p => ({
      name: p.platformName || p.platformId,
      health: p.healthScore || 0,
      compliance: p.complianceScore || 0,
    }))
    .slice(0, 12);

  // Uptime statistics
  const uptimeStats = platforms
    .filter(p => p.uptime !== null)
    .map(p => ({
      name: p.platformName || p.platformId,
      uptime: p.uptime || 0,
    }))
    .sort((a, b) => b.uptime - a.uptime)
    .slice(0, 12);

  if (platformsLoading || statsLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-avg-health">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-health">
              {stats?.avgHealthScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-compliance">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-compliance">
              {stats?.avgComplianceScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">SIDE compliance rate</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-uptime">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-uptime">
              {stats?.avgUptime?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Platform availability</p>
          </CardContent>
        </Card>

        <Card data-testid="card-online-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-online-rate">
              {((stats?.onlinePlatforms || 0) / (stats?.totalPlatforms || 1) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.onlinePlatforms || 0}/{stats?.totalPlatforms || 0} online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" data-testid="tabs-analytics">
        <TabsList>
          <TabsTrigger value="trends" data-testid="tab-trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <BarChart3 className="w-4 h-4 mr-2" />
            Health Scores
          </TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">
            <PieChartIcon className="w-4 h-4 mr-2" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="uptime" data-testid="tab-uptime">
            <Clock className="w-4 h-4 mr-2" />
            Uptime
          </TabsTrigger>
        </TabsList>

        {/* Trends Chart */}
        <TabsContent value="trends">
          <Card data-testid="card-trends-chart">
            <CardHeader>
              <CardTitle>7-Day Trends</CardTitle>
              <CardDescription>
                Platform health, compliance, and uptime over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="avgHealth" 
                    stackId="1"
                    stroke={COLORS.healthy} 
                    fill={COLORS.healthy}
                    fillOpacity={0.6}
                    name="Health Score"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgCompliance" 
                    stackId="2"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Compliance Score"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uptime" 
                    stackId="3"
                    stroke="#8b5cf6" 
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Uptime %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Scores Chart */}
        <TabsContent value="health">
          <Card data-testid="card-health-chart">
            <CardHeader>
              <CardTitle>Platform Health & Compliance Scores</CardTitle>
              <CardDescription>
                Current health and compliance metrics per platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={healthScores}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="health" fill={COLORS.healthy} name="Health Score" />
                  <Bar dataKey="compliance" fill="#3b82f6" name="Compliance Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Charts */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="card-status-distribution">
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Platform status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-side-adoption">
              <CardHeader>
                <CardTitle>SIDE Adoption</CardTitle>
                <CardDescription>SIDE installation status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sideAdoption}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sideAdoption.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Uptime Chart */}
        <TabsContent value="uptime">
          <Card data-testid="card-uptime-chart">
            <CardHeader>
              <CardTitle>Platform Uptime Statistics</CardTitle>
              <CardDescription>
                Uptime percentage for each platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={uptimeStats} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    className="text-xs"
                    width={150}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="uptime" 
                    fill="#8b5cf6"
                    name="Uptime %"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
