/**
 * 📦 SIDE Distribution Dashboard
 * ==============================
 * Visual dashboard for SIDE distribution status and management
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Download, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DistributionStatus {
  id: number;
  platformId: string;
  packageId: string;
  version: string;
  status: 'deployed' | 'failed' | 'pending' | 'removed';
  packageChecksum: string;
  deployedAt: Date;
  lastSync: Date | null;
  complianceScore: number;
  updatedAt: Date;
}

interface DistributionStats {
  totalPlatforms: number;
  distributed: number;
  notDistributed: number;
  status: {
    deployed: number;
    failed: number;
    pending: number;
  };
  distributionRate: number;
  avgComplianceScore: number;
  version: string;
}

export function SideDistributionDashboard() {
  const { toast } = useToast();

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    stats: DistributionStats;
  }>({
    queryKey: ['/api/monitor/distribution/stats'],
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    success: boolean;
    distributions: DistributionStatus[];
  }>({
    queryKey: ['/api/monitor/distribution/status'],
  });

  const deployAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/monitor/distribution/deploy-all', 'POST');
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Deployment Complete',
        description: data.message || 'SIDE deployed to all platforms',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Deployment Failed',
        description: error.message || 'Failed to deploy SIDE',
        variant: 'destructive',
      });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const response = await apiRequest(`/api/monitor/distribution/deploy/${platformId}`, 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Deployment Started',
        description: 'SIDE deployment initiated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Deployment Failed',
        description: error.message || 'Failed to deploy SIDE',
        variant: 'destructive',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const response = await apiRequest(`/api/monitor/distribution/rollback/${platformId}`, 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Rollback Complete',
        description: 'SIDE rolled back successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Rollback Failed',
        description: error.message || 'Failed to rollback SIDE',
        variant: 'destructive',
      });
    },
  });

  const stats: DistributionStats | undefined = statsData?.stats;
  const distributions = statusData?.distributions || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" data-testid="icon-deployed" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" data-testid="icon-failed" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" data-testid="icon-pending" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" data-testid="icon-unknown" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="default" data-testid={`badge-status-deployed`}>Deployed</Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid={`badge-status-failed`}>Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" data-testid={`badge-status-pending`}>Pending</Badge>;
      case 'removed':
        return <Badge variant="outline" data-testid={`badge-status-removed`}>Removed</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-unknown`}>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-platforms">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platforms</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-platforms">
              {statsLoading ? '...' : stats?.totalPlatforms || 0}
            </div>
            <p className="text-xs text-muted-foreground">External platforms</p>
          </CardContent>
        </Card>

        <Card data-testid="card-deployed">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-deployed">
              {statsLoading ? '...' : stats?.status.deployed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : `${stats?.distributionRate.toFixed(1)}%`} distribution rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-version">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SIDE Version</CardTitle>
            <Download className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-version">
              {statsLoading ? '...' : stats?.version || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Current version</p>
          </CardContent>
        </Card>

        <Card data-testid="card-compliance">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-compliance">
              {statsLoading ? '...' : `${stats?.avgComplianceScore || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card data-testid="card-actions">
        <CardHeader>
          <CardTitle>Distribution Actions</CardTitle>
          <CardDescription>Deploy or manage SIDE across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => deployAllMutation.mutate()}
              disabled={deployAllMutation.isPending}
              data-testid="button-deploy-all"
            >
              {deployAllMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Deploy to All Platforms
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/status'] });
                queryClient.invalidateQueries({ queryKey: ['/api/monitor/distribution/stats'] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Status Table */}
      <Card data-testid="card-distribution-status">
        <CardHeader>
          <CardTitle>Distribution Status</CardTitle>
          <CardDescription>SIDE deployment status for each platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" data-testid="tabs-distribution">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="deployed" data-testid="tab-deployed">Deployed</TabsTrigger>
              <TabsTrigger value="failed" data-testid="tab-failed">Failed</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <DistributionTable
                distributions={distributions}
                isLoading={statusLoading}
                onDeploy={(platformId) => deployMutation.mutate(platformId)}
                onRollback={(platformId) => rollbackMutation.mutate(platformId)}
                deployPending={deployMutation.isPending}
                rollbackPending={rollbackMutation.isPending}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="deployed" className="space-y-4">
              <DistributionTable
                distributions={distributions.filter(d => d.status === 'deployed')}
                isLoading={statusLoading}
                onDeploy={(platformId) => deployMutation.mutate(platformId)}
                onRollback={(platformId) => rollbackMutation.mutate(platformId)}
                deployPending={deployMutation.isPending}
                rollbackPending={rollbackMutation.isPending}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              <DistributionTable
                distributions={distributions.filter(d => d.status === 'failed')}
                isLoading={statusLoading}
                onDeploy={(platformId) => deployMutation.mutate(platformId)}
                onRollback={(platformId) => rollbackMutation.mutate(platformId)}
                deployPending={deployMutation.isPending}
                rollbackPending={rollbackMutation.isPending}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <DistributionTable
                distributions={distributions.filter(d => d.status === 'pending')}
                isLoading={statusLoading}
                onDeploy={(platformId) => deployMutation.mutate(platformId)}
                onRollback={(platformId) => rollbackMutation.mutate(platformId)}
                deployPending={deployMutation.isPending}
                rollbackPending={rollbackMutation.isPending}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface DistributionTableProps {
  distributions: DistributionStatus[];
  isLoading: boolean;
  onDeploy: (platformId: string) => void;
  onRollback: (platformId: string) => void;
  deployPending: boolean;
  rollbackPending: boolean;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusBadge: (status: string) => JSX.Element;
}

function DistributionTable({
  distributions,
  isLoading,
  onDeploy,
  onRollback,
  deployPending,
  rollbackPending,
  getStatusIcon,
  getStatusBadge,
}: DistributionTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (distributions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No distributions found</div>;
  }

  return (
    <div className="space-y-2">
      {distributions.map((dist) => (
        <Card key={dist.id} className="hover-elevate" data-testid={`card-distribution-${dist.platformId}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(dist.status)}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold" data-testid={`text-platform-${dist.platformId}`}>
                      {dist.platformId}
                    </h4>
                    {getStatusBadge(dist.status)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Version: <span className="font-mono">{dist.version}</span></div>
                    <div>Package: <span className="font-mono text-xs">{dist.packageId.substring(0, 8)}...</span></div>
                    <div>
                      Deployed: {formatDistanceToNow(new Date(dist.deployedAt), { addSuffix: true })}
                    </div>
                    {dist.lastSync && (
                      <div>
                        Last Sync: {formatDistanceToNow(new Date(dist.lastSync), { addSuffix: true })}
                      </div>
                    )}
                    <div>
                      Compliance: <span className={dist.complianceScore >= 70 ? 'text-green-600' : 'text-red-600'}>
                        {dist.complianceScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeploy(dist.platformId)}
                  disabled={deployPending}
                  data-testid={`button-redeploy-${dist.platformId}`}
                >
                  {deployPending && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                  Re-deploy
                </Button>
                {dist.status === 'deployed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRollback(dist.platformId)}
                    disabled={rollbackPending}
                    data-testid={`button-rollback-${dist.platformId}`}
                  >
                    Rollback
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
