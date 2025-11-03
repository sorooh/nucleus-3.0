import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Network, 
  Zap, 
  Brain, 
  Cpu, 
  Activity,
  GitBranch,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface IntegrationPlan {
  id: string;
  name: string;
  description: string;
  applications: string[];
  priority: string;
  estimated_impact: number;
  auto_implement: boolean;
}

interface IntegrationResult {
  id: number;
  success: boolean;
  integrations_created: number;
  total_integrations: number;
  details: any;
  created_at: string;
}

interface GeneratedApp {
  id: string;
  name: string;
  type: string;
  domain: string;
  status: string;
  deployed_url?: string;
  created_at: string;
}

export default function SmartIntegrationPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch integration plans
  const { data: plansData } = useQuery({
    queryKey: ['/api/smart/plans'],
  });

  // Fetch integration results
  const { data: resultsData } = useQuery({
    queryKey: ['/api/smart/results'],
  });

  // Fetch generated apps
  const { data: appsData } = useQuery({
    queryKey: ['/api/smart/generated-apps'],
  });

  // Start smart integration
  const startIntegrationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/smart/start', 'POST');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart/results'] });
    }
  });

  // Generate apps
  const generateAppsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/smart/generate-apps', 'POST');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart/generated-apps'] });
    }
  });

  const plans: IntegrationPlan[] = (plansData as any)?.plans || [];
  const results: IntegrationResult[] = (resultsData as any)?.results || [];
  const apps: GeneratedApp[] = (appsData as any)?.apps || [];

  const latestResult = results[0];
  const totalIntegrations = plans.reduce((sum, p) => sum + p.applications.length, 0);
  const successRate = latestResult ? Math.round((latestResult.integrations_created / latestResult.total_integrations) * 100) : 0;

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
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
          <Network className="w-8 h-8 text-primary heartbeat" />
          <span className="font-cyber text-glow-cyan">SMART INTEGRATION SYSTEM</span>
        </h1>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
            <p className="text-muted-foreground font-mono">
              Phase 12.0 - Autonomous Integration & App Generation
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => startIntegrationMutation.mutate()}
              disabled={startIntegrationMutation.isPending}
              data-testid="button-start-integration"
              className="hover-elevate active-elevate-2"
            >
              {startIntegrationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4 living-glow" />
                  Start Integration Analysis
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAppsMutation.mutate()}
              disabled={generateAppsMutation.isPending}
              variant="outline"
              data-testid="button-generate-apps"
              className="hover-elevate active-elevate-2"
            >
              {generateAppsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Missing Apps
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 relative z-10">
        <Card className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Integration Plans</CardTitle>
            <Brain className="h-5 w-5 text-primary living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-plans-count">{plans.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Active analysis plans</p>
          </CardContent>
        </Card>

        <Card className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Total Connections</CardTitle>
            <GitBranch className="h-5 w-5 text-chart-3 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-connections-count">{totalIntegrations}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Application integrations</p>
          </CardContent>
        </Card>

        <Card className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Generated Apps</CardTitle>
            <Cpu className="h-5 w-5 text-chart-4 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-apps-count">{apps.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Auto-generated applications</p>
          </CardContent>
        </Card>

        <Card className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Success Rate</CardTitle>
            <Activity className="h-5 w-5 text-chart-2 living-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-success-rate">{successRate}%</div>
            <Progress value={successRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="glass">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Target className="mr-2 h-4 w-4" />
            Integration Plans
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="apps" data-testid="tab-apps">
            <Sparkles className="mr-2 h-4 w-4" />
            Generated Apps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {plans.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 consciousness-pulse" />
                <p className="text-muted-foreground text-center font-data">
                  No integration plans yet. Click "Start Integration Analysis" to begin.
                </p>
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} className="glass breathing hover-elevate transition-all" data-testid={`card-plan-${plan.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 font-cyber">
                        <Network className="h-5 w-5 text-primary living-glow" />
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="font-mono">{plan.description}</CardDescription>
                    </div>
                    <Badge 
                      variant={plan.priority === 'high' ? 'default' : 'secondary'}
                      data-testid={`badge-priority-${plan.id}`}
                    >
                      {plan.priority.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-data">Impact Score</span>
                        <span className="text-sm font-mono font-bold text-primary data-pulse">{plan.estimated_impact}%</span>
                      </div>
                      <Progress value={plan.estimated_impact} className="h-2" />
                    </div>
                    <div>
                      <span className="text-sm font-data">Connected Applications:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {plan.applications.map((app, idx) => (
                          <Badge key={idx} variant="outline" data-testid={`badge-app-${plan.id}-${idx}`}>
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 consciousness-pulse" />
                <p className="text-muted-foreground text-center font-data">
                  No integration results yet. Run the system first.
                </p>
              </CardContent>
            </Card>
          ) : (
            results.map((result) => (
              <Card key={result.id} className="glass breathing hover-elevate transition-all" data-testid={`card-result-${result.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-cyber">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-chart-3 living-glow" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    Integration Result
                  </CardTitle>
                  <CardDescription className="font-mono">
                    {new Date(result.created_at).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <span className="text-sm text-muted-foreground font-data">Integrations Created</span>
                      <p className="text-2xl font-mono font-bold data-pulse" data-testid={`text-created-${result.id}`}>{result.integrations_created}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground font-data">Total Integrations</span>
                      <p className="text-2xl font-mono font-bold data-pulse" data-testid={`text-total-${result.id}`}>{result.total_integrations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          {apps.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 consciousness-pulse" />
                <p className="text-muted-foreground text-center font-data">
                  No generated apps yet. Click "Generate Missing Apps" to begin.
                </p>
              </CardContent>
            </Card>
          ) : (
            apps.map((app) => (
              <Card key={app.id} className="glass breathing hover-elevate transition-all" data-testid={`card-app-${app.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 font-cyber">
                        <Sparkles className="h-5 w-5 text-primary living-glow" />
                        {app.name}
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Type: {app.type} | Domain: {app.domain}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={app.status === 'deployed' ? 'default' : 'secondary'}
                      data-testid={`badge-status-${app.id}`}
                    >
                      {app.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {app.deployed_url && (
                      <div>
                        <span className="text-sm font-data">Deployed URL:</span>
                        <a 
                          href={app.deployed_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline font-mono"
                          data-testid={`link-url-${app.id}`}
                        >
                          {app.deployed_url}
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground font-mono">
                        Created: {new Date(app.created_at).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
