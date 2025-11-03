/**
 * 👑 Executive Command Console
 * =============================
 * Supreme control interface for Nicholas - The Ultimate Controller
 * 
 * Features:
 * - One-click platform actions (restart, deploy, rollback)
 * - Bulk operations across all platforms
 * - Emergency controls
 * - Real-time execution status
 * 
 * @supreme Nicholas commands with absolute authority
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Power, 
  RefreshCw, 
  Upload, 
  RotateCcw, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  Shield,
  Rocket,
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Platform {
  platformId: string;
  platformName: string;
  currentStatus: string;
  sideInstalled: number;
  sideVersion?: string;
}

interface CommandAction {
  id: string;
  name: string;
  description: string;
  icon: any;
  severity: 'safe' | 'warning' | 'danger';
  requiresConfirmation: boolean;
}

const PLATFORM_ACTIONS: CommandAction[] = [
  {
    id: 'deploy_side',
    name: 'Deploy SIDE',
    description: 'Deploy latest SIDE version to platform',
    icon: Upload,
    severity: 'safe',
    requiresConfirmation: false,
  },
  {
    id: 'restart_platform',
    name: 'Restart Platform',
    description: 'Restart platform services',
    icon: RefreshCw,
    severity: 'warning',
    requiresConfirmation: true,
  },
  {
    id: 'rollback_side',
    name: 'Rollback SIDE',
    description: 'Rollback to previous SIDE version',
    icon: RotateCcw,
    severity: 'warning',
    requiresConfirmation: true,
  },
  {
    id: 'force_compliance',
    name: 'Force Compliance',
    description: 'Enforce SIDE compliance immediately',
    icon: Shield,
    severity: 'warning',
    requiresConfirmation: false,
  },
];

const EMERGENCY_ACTIONS: CommandAction[] = [
  {
    id: 'emergency_deploy_all',
    name: 'Emergency Deploy All',
    description: 'Deploy SIDE to all platforms immediately',
    icon: Rocket,
    severity: 'danger',
    requiresConfirmation: true,
  },
  {
    id: 'emergency_shutdown',
    name: 'Emergency Shutdown',
    description: 'Shutdown all platforms (EXTREME)',
    icon: Power,
    severity: 'danger',
    requiresConfirmation: true,
  },
];

export function ExecutiveCommandConsole() {
  const { toast } = useToast();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ action: CommandAction; platforms: string[] } | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Fetch platforms
  const { data: platformsData, isLoading } = useQuery<{ platforms: Platform[] }>({
    queryKey: ['/api/monitor/platforms'],
    refetchInterval: 10000,
  });

  const platforms: Platform[] = platformsData?.platforms || [];

  // Execute command mutation
  const executeCommand = useMutation({
    mutationFn: async (params: { action: string; platformIds: string[] }) => {
      return await apiRequest('/api/command/execute', 'POST', params);
    },
    onSuccess: (data, variables) => {
      toast({
        title: '✅ Command Executed',
        description: `${variables.action} completed successfully for ${variables.platformIds.length} platform(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monitor/platforms'] });
      setExecutingAction(null);
      setSelectedPlatforms(new Set());
    },
    onError: (error: any) => {
      toast({
        title: '❌ Command Failed',
        description: error.message || 'Failed to execute command',
        variant: 'destructive',
      });
      setExecutingAction(null);
    },
  });

  const togglePlatformSelection = (platformId: string) => {
    const newSelection = new Set(selectedPlatforms);
    if (newSelection.has(platformId)) {
      newSelection.delete(platformId);
    } else {
      newSelection.add(platformId);
    }
    setSelectedPlatforms(newSelection);
  };

  const selectAll = () => {
    setSelectedPlatforms(new Set(platforms.map(p => p.platformId)));
  };

  const clearSelection = () => {
    setSelectedPlatforms(new Set());
  };

  const handleAction = (action: CommandAction) => {
    if (selectedPlatforms.size === 0) {
      toast({
        title: 'No Platforms Selected',
        description: 'Please select at least one platform',
        variant: 'destructive',
      });
      return;
    }

    if (action.requiresConfirmation) {
      setConfirmAction({ action, platforms: Array.from(selectedPlatforms) });
    } else {
      executeAction(action.id, Array.from(selectedPlatforms));
    }
  };

  const executeAction = (actionId: string, platformIds: string[]) => {
    setExecutingAction(actionId);
    executeCommand.mutate({ action: actionId, platformIds });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safe': return 'default';
      case 'warning': return 'secondary';
      case 'danger': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Executive Command Console</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Executive Command Console</CardTitle>
                <CardDescription>Supreme control interface for all platforms</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-primary">
              <Zap className="h-3 w-3 mr-1" />
              Nicholas Authority Level: Maximum
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="platforms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="platforms" data-testid="tab-platforms">
                Platform Control
              </TabsTrigger>
              <TabsTrigger value="actions" data-testid="tab-actions">
                Command Actions
              </TabsTrigger>
              <TabsTrigger value="emergency" data-testid="tab-emergency">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Emergency
              </TabsTrigger>
            </TabsList>

            {/* Platform Selection Tab */}
            <TabsContent value="platforms" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedPlatforms.size} / {platforms.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {platforms.map((platform) => (
                  <Card
                    key={platform.platformId}
                    className={`cursor-pointer transition-colors ${
                      selectedPlatforms.has(platform.platformId) ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => togglePlatformSelection(platform.platformId)}
                    data-testid={`platform-card-${platform.platformId}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            platform.currentStatus === 'online' ? 'bg-green-500' :
                            platform.currentStatus === 'degraded' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium">{platform.platformName}</p>
                            <p className="text-xs text-muted-foreground">{platform.platformId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {platform.sideInstalled ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              SIDE {platform.sideVersion || 'installed'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              No SIDE
                            </Badge>
                          )}
                          {selectedPlatforms.has(platform.platformId) && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Command Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Execute commands on {selectedPlatforms.size} selected platform(s)
              </p>

              <div className="grid gap-3">
                {PLATFORM_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isExecuting = executingAction === action.id;

                  return (
                    <Card key={action.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{action.name}</p>
                              <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                          <Button
                            variant={getSeverityColor(action.severity) as any}
                            onClick={() => handleAction(action)}
                            disabled={selectedPlatforms.size === 0 || isExecuting}
                            data-testid={`button-${action.id}`}
                          >
                            {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Execute
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Emergency Actions Tab */}
            <TabsContent value="emergency" className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="font-semibold text-destructive">Emergency Controls</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  These actions affect ALL platforms immediately. Use with extreme caution.
                </p>
              </div>

              <div className="grid gap-3">
                {EMERGENCY_ACTIONS.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Card key={action.id} className="border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-destructive" />
                            <div>
                              <p className="font-medium">{action.name}</p>
                              <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => setConfirmAction({ 
                              action, 
                              platforms: platforms.map(p => p.platformId) 
                            })}
                            data-testid={`button-${action.id}`}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Command Execution
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to execute: <strong>{confirmAction?.action.name}</strong>
              <br />
              This will affect {confirmAction?.platforms.length} platform(s).
              <br /><br />
              {confirmAction?.action.severity === 'danger' && (
                <span className="text-destructive font-semibold">
                  ⚠️ This is a CRITICAL action and cannot be undone!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  executeAction(confirmAction.action.id, confirmAction.platforms);
                  setConfirmAction(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-action"
            >
              Execute Command
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
