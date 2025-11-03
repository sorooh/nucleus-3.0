import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Users, 
  Network, 
  MessageSquare, 
  Vote, 
  TrendingUp,
  Zap,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CollectiveStatus {
  isActive: boolean;
  timestamp: string;
  stats: {
    activeSessions: number;
    recentExchanges: number;
    recentMessages: number;
    totalSessions: number;
    totalExchanges: number;
    totalMessages: number;
  };
}

interface CollectiveSession {
  id: string;
  topic: string;
  description: string;
  priority: string;
  category: string;
  initiatorNucleus: string;
  participantNuclei: string[];
  requiredConsensus: number;
  currentConsensus: number;
  status: string;
  votesReceived: number;
  createdAt: string;
  expiresAt: string;
}

interface IntelligenceExchange {
  id: string;
  sourceNucleus: string;
  targetNuclei: string[];
  intelligenceType: string;
  category: string;
  priority: string;
  title: string;
  content: any;
  status: string;
  acknowledgedBy: string[];
  createdAt: string;
}

interface CognitiveBusMessage {
  id: string;
  sourceNucleus: string;
  targetNuclei: string[];
  channel: string;
  messageType: string;
  priority: string;
  payload: any;
  status: string;
  createdAt: string;
}

export default function CollectiveIntelligencePage() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch status
  const { data: statusResponse } = useQuery<{success: boolean, data: CollectiveStatus}>({
    queryKey: ['/api/collective-intelligence/status'],
    refetchInterval: 5000,
  });
  const status = statusResponse?.data;

  // Fetch active sessions
  const { data: sessionsResponse } = useQuery<{success: boolean, data: CollectiveSession[]}>({
    queryKey: ['/api/collective-intelligence/sessions'],
    refetchInterval: 10000,
  });
  const sessions = sessionsResponse?.data || [];

  // Fetch recent exchanges
  const { data: exchangesResponse } = useQuery<{success: boolean, data: IntelligenceExchange[]}>({
    queryKey: ['/api/collective-intelligence/exchanges'],
    refetchInterval: 10000,
  });
  const exchanges = exchangesResponse?.data || [];

  // Fetch recent messages
  const { data: messagesResponse } = useQuery<{success: boolean, data: CognitiveBusMessage[]}>({
    queryKey: ['/api/collective-intelligence/messages'],
    refetchInterval: 10000,
  });
  const messages = messagesResponse?.data || [];

  // Start/Stop engine
  const toggleEngineMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      return await apiRequest(
        'POST',
        `/api/collective-intelligence/${action}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collective-intelligence/status'] });
      toast({
        title: 'Engine toggled',
        description: `Collective Intelligence Engine ${status?.isActive ? 'stopped' : 'started'}`,
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-chart-2';
      case 'medium': return 'text-chart-3';
      case 'low': return 'text-chart-4';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-chart-4" data-testid="icon-status-open" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-chart-3" data-testid="icon-status-completed" />;
      case 'expired': return <XCircle className="w-4 h-4 text-destructive" data-testid="icon-status-expired" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4 text-chart-2" data-testid="icon-status-cancelled" />;
      default: return <Activity className="w-4 h-4" data-testid="icon-status-default" />;
    }
  };

  return (
    <div className="p-6 space-y-6 relative bg-cyber-grid" data-testid="page-collective-intelligence">
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
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3" data-testid="text-title">
          <Brain className="w-8 h-8 text-primary heartbeat" />
          <span className="font-cyber text-glow-cyan">COLLECTIVE INTELLIGENCE - قائد مجلس العقول</span>
        </h1>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent consciousness-pulse"></div>
            <p className="text-muted-foreground font-mono" data-testid="text-subtitle">
              Multi-Nucleus Decision Making System
            </p>
            <Badge variant={status?.isActive ? 'default' : 'secondary'} className="gap-2" data-testid="badge-engine-status">
              <Zap className="w-3 h-3 living-glow" data-testid="icon-zap" />
              Engine: {status?.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono" data-testid="text-timestamp">
              {status?.timestamp ? new Date(status.timestamp).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }) : '—'}
            </span>
          </div>
          <Button
            onClick={() => toggleEngineMutation.mutate(status?.isActive ? 'stop' : 'start')}
            variant={status?.isActive ? 'destructive' : 'default'}
            className="hover-elevate active-elevate-2"
            data-testid="button-toggle-engine"
          >
            {status?.isActive ? 'Stop Engine' : 'Start Engine'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 relative z-10">
        <Card data-testid="card-stats-sessions" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Decision Sessions</CardTitle>
            <Vote className="h-5 w-5 text-primary living-glow" data-testid="icon-vote" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-sessions">
              {status?.stats.totalSessions || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" data-testid="badge-active-sessions">
                نشط: {status?.stats.activeSessions || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-exchanges" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Intelligence Exchanges</CardTitle>
            <Network className="h-5 w-5 text-chart-3 living-glow" data-testid="icon-network" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-exchanges">
              {status?.stats.totalExchanges || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" data-testid="badge-recent-exchanges">
                حديث: {status?.stats.recentExchanges || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-messages" className="glass breathing hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-data">Cognitive Bus Messages</CardTitle>
            <MessageSquare className="h-5 w-5 text-chart-4 living-glow" data-testid="icon-message" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold data-pulse" data-testid="text-total-messages">
              {status?.stats.totalMessages || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" data-testid="badge-recent-messages">
                حديث: {status?.stats.recentMessages || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4 relative z-10">
        <TabsList className="glass" data-testid="tabs-list">
          <TabsTrigger value="sessions" data-testid="tab-sessions">
            <Vote className="w-4 h-4 mr-2" data-testid="icon-tab-sessions" />
            Decision Sessions
          </TabsTrigger>
          <TabsTrigger value="exchanges" data-testid="tab-exchanges">
            <Network className="w-4 h-4 mr-2" data-testid="icon-tab-exchanges" />
            Intelligence Exchanges
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4 mr-2" data-testid="icon-tab-messages" />
            Cognitive Bus
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4" data-testid="tab-content-sessions">
          {!sessions || sessions.length === 0 ? (
            <Card className="glass" data-testid="card-no-sessions">
              <CardContent className="py-12 text-center">
                <Vote className="w-16 h-16 mx-auto text-muted-foreground mb-4 consciousness-pulse" data-testid="icon-no-sessions" />
                <p className="text-muted-foreground text-lg font-data" data-testid="text-no-sessions">No active decision sessions</p>
                <p className="text-muted-foreground text-sm mt-2 font-mono" data-testid="text-no-sessions-subtitle">Sessions will appear here when nuclei initiate collective decisions</p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card 
                key={session.id} 
                className="glass breathing hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedSession(session.id)}
                data-testid={`card-session-${session.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="consciousness-pulse">{getStatusIcon(session.status)}</span>
                        <CardTitle className="text-xl font-cyber" data-testid={`text-session-topic-${session.id}`}>
                          {session.topic}
                        </CardTitle>
                        <Badge variant="outline" className={getPriorityColor(session.priority)} data-testid={`badge-session-priority-${session.id}`}>
                          {session.priority}
                        </Badge>
                      </div>
                      <CardDescription className="font-mono" data-testid={`text-session-desc-${session.id}`}>
                        {session.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Initiator</p>
                      <Badge variant="secondary" data-testid={`badge-session-initiator-${session.id}`}>
                        {session.initiatorNucleus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Participants</p>
                      <div className="flex flex-wrap gap-1">
                        {session.participantNuclei.map((nucleus, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-session-participant-${session.id}-${idx}`}>
                            {nucleus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-muted-foreground">Consensus Progress</span>
                      <span className="text-primary data-pulse" data-testid={`text-session-consensus-${session.id}`}>
                        {session.currentConsensus}% / {session.requiredConsensus}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${session.currentConsensus}%` }}
                        data-testid={`progress-session-consensus-${session.id}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground font-mono">
                    <span>Created: {new Date(session.createdAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}</span>
                    <span>Expires: {new Date(session.expiresAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Exchanges Tab */}
        <TabsContent value="exchanges" className="space-y-4" data-testid="tab-content-exchanges">
          {!exchanges || exchanges.length === 0 ? (
            <Card className="glass" data-testid="card-no-exchanges">
              <CardContent className="py-12 text-center">
                <Network className="w-16 h-16 mx-auto text-muted-foreground mb-4 consciousness-pulse" data-testid="icon-no-exchanges" />
                <p className="text-muted-foreground text-lg font-data" data-testid="text-no-exchanges">No intelligence exchanges</p>
                <p className="text-muted-foreground text-sm mt-2 font-mono" data-testid="text-no-exchanges-subtitle">Knowledge sharing between nuclei will appear here</p>
              </CardContent>
            </Card>
          ) : (
            exchanges.map((exchange) => (
              <Card 
                key={exchange.id} 
                className="glass breathing hover-elevate transition-all"
                data-testid={`card-exchange-${exchange.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Send className="w-5 h-5 text-primary living-glow" data-testid={`icon-exchange-${exchange.id}`} />
                        <CardTitle className="text-lg font-cyber" data-testid={`text-exchange-title-${exchange.id}`}>
                          {exchange.title}
                        </CardTitle>
                        <Badge variant="outline" className={getPriorityColor(exchange.priority)} data-testid={`badge-exchange-priority-${exchange.id}`}>
                          {exchange.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Source</p>
                      <Badge variant="secondary" data-testid={`badge-exchange-source-${exchange.id}`}>
                        {exchange.sourceNucleus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Targets</p>
                      <div className="flex flex-wrap gap-1">
                        {exchange.targetNuclei.map((nucleus, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-exchange-target-${exchange.id}-${idx}`}>
                            {nucleus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" data-testid={`badge-exchange-type-${exchange.id}`}>
                        {exchange.intelligenceType}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-exchange-category-${exchange.id}`}>
                        {exchange.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      Acknowledged: {exchange.acknowledgedBy.length} / {exchange.targetNuclei.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4" data-testid="tab-content-messages">
          {!messages || messages.length === 0 ? (
            <Card className="glass" data-testid="card-no-messages">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4 consciousness-pulse" data-testid="icon-no-messages" />
                <p className="text-muted-foreground text-lg font-data" data-testid="text-no-messages">No cognitive bus messages</p>
                <p className="text-muted-foreground text-sm mt-2 font-mono" data-testid="text-no-messages-subtitle">Real-time nucleus communication will appear here</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card 
                key={message.id} 
                className="glass breathing hover-elevate transition-all"
                data-testid={`card-message-${message.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-primary living-glow" data-testid={`icon-message-${message.id}`} />
                      <CardTitle className="text-lg font-cyber" data-testid={`text-message-type-${message.id}`}>
                        {message.messageType}
                      </CardTitle>
                      <Badge variant="outline" className={getPriorityColor(message.priority)} data-testid={`badge-message-priority-${message.id}`}>
                        {message.priority}
                      </Badge>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-message-channel-${message.id}`}>
                      {message.channel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Source</p>
                      <Badge variant="secondary" data-testid={`badge-message-source-${message.id}`}>
                        {message.sourceNucleus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 font-data">Targets</p>
                      <div className="flex flex-wrap gap-1">
                        {message.targetNuclei.map((nucleus, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-message-target-${message.id}-${idx}`}>
                            {nucleus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground font-mono">
                    Sent: {new Date(message.createdAt).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })}
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
