import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Wifi, WifiOff, Clock, Shield, CheckCircle, XCircle, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Agent {
  id: string;
  uuid: string;
  unit: string;
  agentType: string;
  name: string;
  source: string;
  ip: string;
  status: string;
  lastPing: string;
  activatedAt: string;
  isOnline: boolean;
  lastPingAgo: number;
}

interface PermissionRequest {
  id: string;
  requestId: string;
  agentId: string;
  action: string;
  details: any;
  status: string;
  createdAt: string;
}

// Helper: Get platform name in Arabic
function getPlatformName(agent: Agent): string {
  // Priority: source > unit
  const identifier = agent.source !== 'unknown' ? agent.source : agent.unit;
  
  const platformMap: Record<string, string> = {
    'B2B': 'منصة التجارة B2B',
    'B2C': 'منصة التجارة B2C',
    'CE': 'محرك التجارة الإلكترونية',
    'Accounting': 'نظام المحاسبة',
    'MAIL_HUB': 'مركز البريد',
    'Nucleus_Internal': 'النواة الداخلية',
    'Nucleus_Core': 'نواة النظام المركزية',
    'Nucleus_Services': 'خدمات النواة',
    'UNIT_ALPHA': 'الوحدة ألفا',
    'UNIT_BETA': 'الوحدة بيتا',
  };
  
  return platformMap[identifier] || identifier;
}

// Helper: Get platform color variant
function getPlatformVariant(agent: Agent): 'default' | 'secondary' | 'outline' {
  const identifier = agent.source !== 'unknown' ? agent.source : agent.unit;
  
  if (identifier.includes('Nucleus_Internal')) return 'outline';
  if (identifier.includes('B2B') || identifier.includes('B2C')) return 'default';
  return 'secondary';
}

export default function AgentsMonitor() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { data: agentsData, isLoading: agentsLoading } = useQuery<{
    success: boolean;
    agents: Agent[];
  }>({
    queryKey: ['/api/agents'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: statsData } = useQuery<{
    success: boolean;
    stats: {
      total: number;
      active: number;
      pendingRequests: number;
    };
  }>({
    queryKey: ['/api/agents/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: agentDetails } = useQuery<{
    success: boolean;
    agent: Agent;
    permissions: PermissionRequest[];
  }>({
    queryKey: ['/api/agents', selectedAgent],
    enabled: !!selectedAgent,
  });

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const agents = agentsData?.agents || [];
  const totalAgents = statsData?.stats?.total || 0;
  const activeAgents = statsData?.stats?.active || 0;
  const pendingRequests = statsData?.stats?.pendingRequests || 0;

  // Group agents by platform (using source or unit)
  const agentsByPlatform = agents.reduce((acc, agent) => {
    const platform = getPlatformName(agent);
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مراقبة البوتات الذكية</h1>
          <p className="text-muted-foreground">MultiBot Agents - Command & Control System</p>
        </div>
        <div className="flex gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{totalAgents}</div>
                  <div className="text-xs text-muted-foreground">إجمالي البوتات</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{activeAgents}</div>
                  <div className="text-xs text-muted-foreground">متصل الآن</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agents by Platform */}
      <div className="grid gap-6">
        {Object.entries(agentsByPlatform).map(([platformName, platformAgents]) => (
          <Card key={platformName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {platformName}
                <Badge variant="outline" className="mr-auto">
                  {platformAgents.length} بوتات
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformAgents.map((agent) => (
                  <Card
                    key={agent.uuid}
                    className={`cursor-pointer transition-all hover-elevate ${
                      selectedAgent === agent.uuid ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent.uuid)}
                    data-testid={`card-agent-${agent.uuid}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {agent.isOnline ? (
                            <Wifi className="h-4 w-4 text-green-500" data-testid={`icon-online-${agent.uuid}`} />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-500" data-testid={`icon-offline-${agent.uuid}`} />
                          )}
                          <CardTitle className="text-sm">{agent.name}</CardTitle>
                        </div>
                        <Badge variant={agent.isOnline ? 'default' : 'destructive'} data-testid={`status-${agent.uuid}`}>
                          {agent.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {agent.agentType}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Server className="h-3 w-3" />
                        <Badge variant={getPlatformVariant(agent)} className="text-xs">
                          {getPlatformName(agent)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        آخر ping: {agent.lastPingAgo < 60 ? `${agent.lastPingAgo}ث` : `${Math.floor(agent.lastPingAgo / 60)}د`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        IP: {agent.ip}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Details Panel */}
      {selectedAgent && agentDetails && (
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل البوت</CardTitle>
            <CardDescription>{agentDetails.agent.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">UUID</div>
                <div className="text-xs text-muted-foreground font-mono">{agentDetails.agent.uuid}</div>
              </div>
              <div>
                <div className="text-sm font-medium">الوحدة</div>
                <div className="text-xs text-muted-foreground">{agentDetails.agent.unit}</div>
              </div>
              <div>
                <div className="text-sm font-medium">النوع</div>
                <div className="text-xs text-muted-foreground">{agentDetails.agent.agentType}</div>
              </div>
              <div>
                <div className="text-sm font-medium">IP Address</div>
                <div className="text-xs text-muted-foreground">{agentDetails.agent.ip}</div>
              </div>
            </div>

            {/* Permission Requests */}
            {agentDetails.permissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">طلبات الإذن</h3>
                <div className="space-y-2">
                  {agentDetails.permissions.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{req.action}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(req.createdAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.status === 'approved' && (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <Badge variant="default">موافق عليه</Badge>
                              </>
                            )}
                            {req.status === 'denied' && (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <Badge variant="destructive">مرفوض</Badge>
                              </>
                            )}
                            {req.status === 'pending' && (
                              <>
                                <Shield className="h-4 w-4 text-yellow-500" />
                                <Badge variant="outline">قيد الانتظار</Badge>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="default" data-testid={`button-approve-${req.id}`}>
                                    موافقة
                                  </Button>
                                  <Button size="sm" variant="destructive" data-testid={`button-deny-${req.id}`}>
                                    رفض
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {agents.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">لا توجد بوتات متصلة</h3>
            <p className="text-sm text-muted-foreground mt-2">
              انشر البوتات من مجلد <code className="bg-muted px-2 py-1 rounded">multibot-agents/</code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
