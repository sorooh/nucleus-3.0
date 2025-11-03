import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Activity, CheckCircle2, Clock, XCircle, Zap, Brain, Target } from "lucide-react";

interface ProactiveAction {
  id: string;
  actionId: string;
  actionType: string;
  actionTitle: string;
  actionDescription?: string;
  targetPlatform: string;
  executionStatus: string;
  executionDuration?: number;
  executionResult?: any;
  createdAt: string;
  executionCompleted?: string;
  priority: string;
}

interface ExecutorStatus {
  isActive: boolean;
  executingActions: number;
  timestamp: string;
}

interface RecentActionsResponse {
  actions: ProactiveAction[];
  stats: {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  };
}

export default function ProactiveActions() {
  const { data: statusData } = useQuery<{ status: ExecutorStatus }>({
    queryKey: ['/api/proactive-actions/status'],
    refetchInterval: 3000,
  });

  const { data: recentData, isLoading } = useQuery<RecentActionsResponse>({
    queryKey: ['/api/proactive-actions/recent'],
    refetchInterval: 5000,
  });

  const status = statusData?.status;
  const stats = recentData?.stats;
  const actions = recentData?.actions || [];

  const getStatusIcon = (executionStatus: string) => {
    switch (executionStatus) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" data-testid="icon-completed" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" data-testid="icon-failed" />;
      case 'executing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" data-testid="icon-executing" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" data-testid="icon-pending" />;
    }
  };

  const getStatusBadge = (executionStatus: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      failed: "destructive",
      executing: "secondary",
    };
    return (
      <Badge variant={variants[executionStatus] || "secondary"} data-testid={`badge-${executionStatus}`}>
        {executionStatus}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'normal':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Zap className="h-8 w-8 text-primary" />
            Nicholas Proactive Actions
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            Real-time monitoring of Nicholas autonomous actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.isActive ? (
            <Badge variant="default" className="gap-2" data-testid="badge-executor-active">
              <Activity className="h-3 w-3 animate-pulse" />
              Executor Active
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid="badge-executor-inactive">
              Executor Inactive
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-actions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-actions">
              {stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-actions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed-actions">
              {stats?.completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully executed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-failed-actions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failed-actions">
              {stats?.failed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-success-rate">
              {stats?.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-live-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Nicholas Cognitive Pulse
          </CardTitle>
          <CardDescription>
            Live monitoring of autonomous actions and decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg" data-testid="container-executor-status">
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${status?.isActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                <span className="font-medium">Executor Status:</span>
              </div>
              <Badge variant={status?.isActive ? "default" : "secondary"}>
                {status?.isActive ? 'Active & Monitoring' : 'Inactive'}
              </Badge>
              {status?.executingActions ? (
                <Badge variant="secondary" className="gap-1">
                  <Activity className="h-3 w-3 animate-pulse" />
                  {status.executingActions} executing now
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-actions">
        <CardHeader>
          <CardTitle>Recent Actions</CardTitle>
          <CardDescription>
            Latest actions taken by Nicholas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-actions">
              <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading actions...</span>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-actions">
              No actions yet. Nicholas is monitoring...
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={action.id}>
                    <div 
                      className="flex items-start gap-4 p-4 rounded-lg border hover-elevate transition-colors"
                      data-testid={`action-${action.actionId}`}
                    >
                      <div className="mt-1">
                        {getStatusIcon(action.executionStatus)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium" data-testid={`text-action-title-${action.actionId}`}>
                              {action.actionTitle}
                            </h4>
                            {action.actionDescription && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {action.actionDescription}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(action.executionStatus)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span data-testid={`text-platform-${action.actionId}`}>
                              {action.targetPlatform}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span data-testid={`text-time-${action.actionId}`}>
                              {formatTime(action.createdAt)}
                            </span>
                          </div>
                          {action.executionDuration && (
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              <span data-testid={`text-duration-${action.actionId}`}>
                                {formatDuration(action.executionDuration)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className={`font-medium ${getPriorityColor(action.priority)}`}>
                              {action.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {action.executionResult && action.executionStatus === 'completed' && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <pre className="overflow-x-auto">
                              {JSON.stringify(action.executionResult, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < actions.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
