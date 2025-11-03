import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Rocket, Layers, CheckCircle, Clock, Wrench, Zap, Database, TrendingUp, AlertCircle, Construction } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Type definitions
interface AutoBuilderStatus {
  success: boolean;
  data: {
    isActive: boolean;
    queuedBuilds: number;
    activeBuilds: number;
    timestamp: string;
    queue: {
      totalBuilds: number;
      queued: number;
      building: number;
      completed: number;
      failed: number;
      activeBuilds: number;
    };
  };
}

interface BuildRequest {
  id: string;
  systemName: string;
  systemType: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
}

interface BuildsResponse {
  success: boolean;
  data: BuildRequest[];
}

export default function AutoBuilderPage() {
  // PHASE 10.9: Data Purity Enforcement
  // NO fallback data, NO mock values - database-only queries
  
  // Fetch Auto-Builder status
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery<AutoBuilderStatus>({
    queryKey: ['/api/auto-builder/status'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Fetch builds
  const { data: buildsData, isLoading: buildsLoading } = useQuery<BuildsResponse>({
    queryKey: ['/api/auto-builder/builds'],
    refetchInterval: 10000,
  });

  const isLoading = statusLoading || buildsLoading;

  // PHASE 10.9: Fail-fast on database errors (no mock fallback)
  if (statusError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="glass border-hot-pink/30 max-w-md">
          <CardHeader>
            <CardTitle className="text-hot-pink">❌ Database Connection Error</CardTitle>
            <CardDescription>
              Auto-Builder system requires real database connection.
              Mock data is not permitted (Phase 10.9).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Error: {(statusError as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalBuilds = statusData?.data?.queue?.totalBuilds || 0;
  const completedBuilds = statusData?.data?.queue?.completed || 0;
  const queuedBuilds = statusData?.data?.queue?.queued || 0;
  const buildingNow = statusData?.data?.queue?.building || 0;
  const failedBuilds = statusData?.data?.queue?.failed || 0;

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      building: 'bg-electric-blue/20 text-electric-blue border-electric-blue/50',
      completed: 'bg-neon-green/20 text-neon-green border-neon-green/50',
      failed: 'bg-hot-pink/20 text-hot-pink border-hot-pink/50',
    };
    
    return (
      <Badge 
        data-testid={`badge-status-${status}`}
        className={`${statusColors[status] || 'bg-gray-500/20 text-gray-500 border-gray-500/50'} border`}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
      medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      high: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
      critical: 'bg-hot-pink/20 text-hot-pink border-hot-pink/50',
    };
    
    return (
      <Badge 
        data-testid={`badge-priority-${priority}`}
        className={`${priorityColors[priority] || 'bg-gray-500/20 text-gray-500 border-gray-500/50'} border`}
      >
        {priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold neon-text-cyan mb-2" data-testid="text-page-title">
            🏗️ Auto-Builder System
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Phase 10.4 → 10.8: Autonomous System Construction
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusData?.data?.isActive ? (
            <Badge className="bg-neon-green/20 text-neon-green border-neon-green/50 border px-4 py-2" data-testid="badge-engine-status">
              <Zap className="w-4 h-4 mr-2" />
              ACTIVE
            </Badge>
          ) : (
            <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/50 border px-4 py-2" data-testid="badge-engine-status">
              <Clock className="w-4 h-4 mr-2" />
              INACTIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-electric-blue/30 hover-elevate" data-testid="card-total-builds">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Builds</CardTitle>
            <Database className="h-4 w-4 text-electric-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text-cyan" data-testid="text-total-builds">{totalBuilds}</div>
            <p className="text-xs text-muted-foreground">All-time build requests</p>
          </CardContent>
        </Card>

        <Card className="glass border-neon-green/30 hover-elevate" data-testid="card-completed-builds">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text-green" data-testid="text-completed-builds">{completedBuilds}</div>
            <p className="text-xs text-muted-foreground">Successfully built systems</p>
          </CardContent>
        </Card>

        <Card className="glass border-yellow-500/30 hover-elevate" data-testid="card-queued-builds">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-queued-builds">{queuedBuilds}</div>
            <p className="text-xs text-muted-foreground">Pending builds</p>
          </CardContent>
        </Card>

        <Card className="glass border-hot-pink/30 hover-elevate" data-testid="card-building-now">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Building</CardTitle>
            <Construction className="h-4 w-4 text-hot-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-hot-pink" data-testid="text-building-now">{buildingNow}</div>
            <p className="text-xs text-muted-foreground">Active builds</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="builds" className="w-full">
        <TabsList className="glass" data-testid="tabs-list">
          <TabsTrigger value="builds" data-testid="tab-builds">Build Requests</TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">System Overview</TabsTrigger>
        </TabsList>

        {/* Build Requests Tab */}
        <TabsContent value="builds" className="space-y-4">
          <Card className="glass border-electric-blue/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-electric-blue" />
                Build Requests
              </CardTitle>
              <CardDescription>All system build requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading builds...</div>
              ) : buildsData && buildsData.data.length > 0 ? (
                <div className="space-y-2">
                  {buildsData.data.map((build) => (
                    <div
                      key={build.id}
                      className="flex items-center justify-between p-4 glass rounded-lg border border-white/10 hover-elevate"
                      data-testid={`build-item-${build.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium" data-testid={`text-build-name-${build.id}`}>{build.systemName}</h4>
                          {getStatusBadge(build.status)}
                          {getPriorityBadge(build.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-build-description-${build.id}`}>
                          {build.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Type: {build.systemType} • Created {formatDistanceToNow(new Date(build.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No builds found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="glass border-electric-blue/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-electric-blue" />
                System Overview
              </CardTitle>
              <CardDescription>Auto-Builder engine status and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 glass rounded-lg">
                  <div className="text-sm text-muted-foreground">Engine Status</div>
                  <div className="text-xl font-bold neon-text-cyan">
                    {statusData?.data?.isActive ? 'ACTIVE ✅' : 'INACTIVE ⏸️'}
                  </div>
                </div>
                <div className="p-4 glass rounded-lg">
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-xl font-bold neon-text-green">
                    {totalBuilds > 0 ? Math.round((completedBuilds / totalBuilds) * 100) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
