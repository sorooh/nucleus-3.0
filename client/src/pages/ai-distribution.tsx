import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cpu, Zap, Globe, TrendingUp, Activity, Database } from 'lucide-react';
import { useState } from 'react';

export default function AIDistribution() {
  const [isDistributing, setIsDistributing] = useState(false);

  // Fetch AI distribution stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/intelligence/ai-distribution/stats'],
  });

  // Fetch Federation AI endpoint info
  const { data: aiEndpoint } = useQuery({
    queryKey: ['/api/federation/ai/info'],
  });

  const handleDistribute = async () => {
    setIsDistributing(true);
    try {
      const response = await fetch('/api/intelligence/distribute-ai', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        await refetchStats();
      }
    } catch (error) {
      console.error('Distribution failed:', error);
    } finally {
      setIsDistributing(false);
    }
  };

  const platforms = [
    'MAIL_HUB', 'SUROOH_CHAT', 'ACADEMY', 'B2B', 'B2C',
    'CE', 'ACCOUNTING', 'WALLET', 'CUSTOMER_SERVICE',
    'INTEGRATION_HUB', 'NICHOLAS_CORE'
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Cpu className="w-8 h-8 text-primary" />
              AI Distribution Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Llama 3.3 70B - Distributed AI Intelligence across Surooh Empire
            </p>
          </div>
          <Button
            onClick={handleDistribute}
            disabled={isDistributing}
            data-testid="button-distribute"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isDistributing ? 'Distributing...' : 'Distribute AI Now'}
          </Button>
        </div>

        {/* Model Info Card */}
        <Card data-testid="card-model-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              AI Model Information
            </CardTitle>
            <CardDescription>
              Self-hosted GPU-powered AI running on RunPod
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="text-lg font-semibold" data-testid="text-model-name">
                  Llama 3.3 70B (Q4)
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Provider</div>
                <div className="text-lg font-semibold">Self-hosted GPU</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Endpoint</div>
                <div className="text-sm font-mono bg-muted px-2 py-1 rounded" data-testid="text-endpoint">
                  {aiEndpoint?.endpoint || 'Loading...'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Zap className="w-3 h-3" />
                100% Private
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Activity className="w-3 h-3" />
                Unlimited Usage
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Globe className="w-3 h-3" />
                Arabic & English
              </Badge>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                GPU Accelerated
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Stats */}
        <Card data-testid="card-distribution-stats">
          <CardHeader>
            <CardTitle>Distribution Statistics</CardTitle>
            <CardDescription>
              Real-time AI distribution metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Distributed</div>
                <div className="text-2xl font-bold" data-testid="text-total-distributed">
                  {stats?.stats?.totalDistributed || 0}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Queue Size</div>
                <div className="text-2xl font-bold" data-testid="text-queue-size">
                  {stats?.stats?.queueSize || 0}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Active Status</div>
                <div className="text-2xl font-bold">
                  {stats?.stats?.active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Last Distribution</div>
                <div className="text-sm" data-testid="text-last-distribution">
                  {stats?.stats?.lastDistribution
                    ? new Date(stats.stats.lastDistribution).toLocaleString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platforms Grid */}
        <Card data-testid="card-platforms">
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
            <CardDescription>
              {platforms.length} platforms ready to receive AI capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {platforms.map((platform) => {
                const distributionCount = stats?.stats?.distributionByPlatform?.[platform] || 0;
                return (
                  <Card key={platform} className="hover-elevate" data-testid={`card-platform-${platform}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{platform}</div>
                          <div className="text-xs text-muted-foreground">
                            {distributionCount} distributions
                          </div>
                        </div>
                        <Badge variant={distributionCount > 0 ? 'default' : 'secondary'}>
                          {distributionCount > 0 ? 'Active' : 'Ready'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Distribution by Source */}
        {stats?.stats?.distributionBySource && Object.keys(stats.stats.distributionBySource).length > 0 && (
          <Card data-testid="card-source-stats">
            <CardHeader>
              <CardTitle>Distribution by Source</CardTitle>
              <CardDescription>
                Intelligence sources contributing to distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(stats.stats.distributionBySource).map(([source, count]) => (
                  <div key={source} className="space-y-1">
                    <div className="text-sm text-muted-foreground capitalize">{source}</div>
                    <div className="text-2xl font-bold" data-testid={`text-source-${source}`}>
                      {count as number}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
