/**
 * ═══════════════════════════════════════════════════════════
 * Nicholas Integration Hub - 2050 Advanced Dashboard
 * ═══════════════════════════════════════════════════════════
 * Futuristic platform monitoring with real-time connections
 * Built from absolute zero - Abu Sham Vision (November 1, 2025)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useIntegrationHubWebSocket } from '@/hooks/use-integration-hub-websocket';
import { PlatformRegistrationDialog } from '@/components/integration-hub/platform-registration-dialog';
import MetricsDashboard from './metrics-dashboard';

// Platform interface matching backend API (REAL - may be uppercase)
interface Platform {
  id: string;
  name: string;
  displayName: string;
  arabicName?: string;
  description?: string;
  type: string;
  status: string; // May be uppercase from API
  authMode?: string;
  rateLimitRPM?: number;
  registeredAt: string;
  lastActive?: string | null;
  // progress REMOVED - was mock data
  // health REMOVED - was mock data
  links: PlatformLink[];
  integrations: PlatformIntegration[];
}

interface PlatformLink {
  id: string;
  sourcePlatformId: string;
  targetPlatformId: string;
  connectedTo: string;
  linkType: string;
  connectionProtocol: string;
  status: string;
  healthStatus: string; // May be uppercase from API
  visualMetadata: {
    strength: string; // May be uppercase from API
    animation?: string;
    color?: string;
  };
}

interface PlatformIntegration {
  id: string;
  name: string;
  provider: string;
  status: string;
  healthStatus: string; // May be uppercase from API
  health: string;
}

// Normalized types for UI
type NormalizedStatus = 'healthy' | 'degraded' | 'maintenance' | 'offline';
type NormalizedHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type NormalizedStrength = 'strong' | 'normal' | 'weak' | 'unknown';

// Helper to normalize status from API (handles both uppercase and lowercase)
const normalizeStatus = (status: string): NormalizedStatus => {
  const normalized = status.toLowerCase();
  if (normalized === 'healthy' || normalized === 'active') return 'healthy'; // active = healthy
  if (normalized === 'degraded') return 'degraded';
  if (normalized === 'maintenance') return 'maintenance';
  if (normalized === 'offline' || normalized === 'inactive') return 'offline';
  return 'offline'; // default
};

// Helper to normalize health status from API
const normalizeHealthStatus = (health: string): NormalizedHealthStatus => {
  const normalized = health.toLowerCase();
  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'degraded') return 'degraded';
  if (normalized === 'unhealthy') return 'unhealthy';
  return 'unknown';
};

// Helper to normalize strength from API
const normalizeStrength = (strength: string): NormalizedStrength => {
  const normalized = strength.toLowerCase();
  if (normalized === 'strong') return 'strong';
  if (normalized === 'normal') return 'normal';
  if (normalized === 'weak') return 'weak';
  return 'unknown';
};

interface Stats {
  totalPlatforms: number;
  onlinePlatforms: number;
  offlinePlatforms: number;
  // healthPercentage REMOVED - was mock data
  activeDeployments: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

interface Task {
  id: string;
  nucleusId: string;
  jobType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: string;
  healthStatus: string;
  category?: string;
  metadata?: any;
}

interface Deployment {
  id: string;
  nucleusId: string;
  version: string;
  status: string;
  deployedAt?: string;
  createdAt: string;
}

interface IntegrationAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  status: string;
  timestamp: string;
  // userId, userRole, ipAddress, error, details REMOVED for security (sanitized public endpoint)
}

// النواة المركزية (Core Nuclei) - 4 منصات رئيسية
const CORE_NUCLEI_IDS = [
  'nicholas', // Nicholas 🧠 - المخ (Brain)
  'side',     // SIDE 💻 - الكود (Code)
  'academy',  // Academy 🤖 - البوتات (Bots)
  'matrix',   // Matrix 🏗️ - البناء (Build)
];

export default function IntegrationHubDashboard() {
  const [filter, setFilter] = useState<'all' | 'healthy' | 'degraded' | 'maintenance'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [activeTab, setActiveTab] = useState<'platforms' | 'tasks' | 'integrations' | 'deployments' | 'connections' | 'metrics'>('platforms');
  const [highlightedPlatform, setHighlightedPlatform] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch platforms with polling fallback when WebSocket unavailable
  const { data: platformsData, isLoading: platformsLoading } = useQuery<{ success: boolean; data: Platform[] }>({
    queryKey: ['/api/integration-hub/platforms'],
    refetchInterval: 10000, // Fallback polling every 10s (WebSocket preferred)
    staleTime: 5000, // Allow WebSocket updates to be fresher
  });

  // WebSocket for real-time updates (Phase 3)
  const { isConnected: wsConnected, lastUpdate } = useIntegrationHubWebSocket({
    enabled: true,
    autoReconnect: true,
    onPlatformUpdate: (platforms) => {
      console.log('[Dashboard] 📡 Received platform updates:', platforms.length);
      // Update platforms in cache
      queryClient.setQueryData(['/api/integration-hub/platforms'], (old: any) => {
        if (!old) return { success: true, data: platforms };
        
        // Merge WebSocket updates with existing data (status only - platformRegistry has no health field)
        const existingPlatforms = old.data || [];
        const updatedPlatforms = existingPlatforms.map((p: any) => {
          const wsUpdate = platforms.find((wu: any) => wu.id === p.id);
          if (wsUpdate) {
            return { ...p, status: wsUpdate.status };
          }
          return p;
        });

        return { success: true, data: updatedPlatforms };
      });
    },
    onStatusChange: (platformId, status) => {
      console.log(`[Dashboard] 📢 Status change: ${platformId} → ${status}`);
      
      // Update specific platform in cache
      queryClient.setQueryData(['/api/integration-hub/platforms'], (old: any) => {
        if (!old) return old;
        
        const updatedPlatforms = old.data.map((p: Platform) => 
          p.id === platformId ? { ...p, status } : p
        );

        return { success: true, data: updatedPlatforms };
      });

      // Also invalidate to refetch full data
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
    },
    onNewConnection: (sourcePlatformId, targetPlatformId) => {
      console.log(`[Dashboard] 🔗 New connection: ${sourcePlatformId} → ${targetPlatformId}`);
      
      // Invalidate connections graph
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/connections/graph'] });
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery<{ success: boolean; data: Stats }>({
    queryKey: ['/api/integration-hub/stats'],
    refetchInterval: 5000, // Refresh every 5s
  });

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ success: boolean; data: Task[] }>({
    queryKey: ['/api/integration-hub/tasks'],
    refetchInterval: 15000, // Refresh every 15s
  });

  // Fetch integrations
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery<{ success: boolean; data: Integration[] }>({
    queryKey: ['/api/integration-hub/integrations'],
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch deployments
  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery<{ success: boolean; data: Deployment[] }>({
    queryKey: ['/api/integration-hub/deployments'],
    refetchInterval: 20000, // Refresh every 20s
  });

  const platforms = platformsData?.data || [];
  const stats = statsData?.data;
  const tasks = tasksData?.data || [];
  const integrations = integrationsData?.data || [];
  const deployments = deploymentsData?.data || [];

  // تقسيم المنصات: النواة المركزية (4) + المنصات العادية (13)
  const coreNuclei = platforms.filter(p => CORE_NUCLEI_IDS.includes(p.id));
  const regularPlatforms = platforms.filter(p => !CORE_NUCLEI_IDS.includes(p.id));

  // Filter platforms (normalize status for comparison)
  const filteredCoreNuclei = coreNuclei.filter((p) => {
    if (filter === 'all') return true;
    return normalizeStatus(p.status) === filter;
  });

  const filteredRegularPlatforms = regularPlatforms.filter((p) => {
    if (filter === 'all') return true;
    return normalizeStatus(p.status) === filter;
  });

  // getHealthScore REMOVED - was using mock progress data
  // Platform status is now determined purely from visual state (pulsing vs grayscale)

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      {/* Background Grid */}
      <BackgroundGrid />

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-primary">Nicholas</span> Integration Hub
                  <span className="ml-3 text-xs text-muted-foreground">// 2050 // Advanced Platform Monitoring</span>
                </h1>
                {/* WebSocket Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-border/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {wsConnected ? 'Live' : 'Offline'} {lastUpdate && wsConnected ? '• Updated just now' : ''}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time platform orchestration and intelligent integration management
              </p>
            </div>
            
            {/* Filter Buttons + Add Platform */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid="filter-all"
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('healthy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === 'healthy'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid="filter-healthy"
                >
                  Healthy
                </button>
                <button
                  onClick={() => setFilter('degraded')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === 'degraded'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid="filter-degraded"
                >
                  Degraded
                </button>
                <button
                  onClick={() => setFilter('maintenance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === 'maintenance'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid="filter-maintenance"
                >
                  Maintenance
                </button>
              </div>

              {/* Phase 4: Add Platform Button */}
              <div className="border-l border-border/30 pl-3">
                <PlatformRegistrationDialog />
              </div>
            </div>
          </div>

          {/* Stats Overview - ONLY REAL DATA */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <StatCard
                label="Total Platforms"
                value={stats.totalPlatforms.toString()}
                color="cyan"
                data-testid="stat-total-platforms"
              />
              <StatCard
                label="Online"
                value={stats.onlinePlatforms.toString()}
                color="green"
                data-testid="stat-online-platforms"
              />
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setActiveTab('platforms')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'platforms'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-platforms"
            >
              Platforms ({platforms.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-tasks"
            >
              Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'integrations'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-integrations"
            >
              Integrations ({integrations.length})
            </button>
            <button
              onClick={() => setActiveTab('deployments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'deployments'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-deployments"
            >
              Deployments ({deployments.length})
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'connections'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-connections"
            >
              Connections Graph 🌐
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'metrics'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              data-testid="tab-metrics"
            >
              Performance Metrics 📊
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Platforms Tab */}
          {activeTab === 'platforms' && (
            <>
              {platformsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading platforms...</p>
                </div>
              ) : (
                <>
                  {/* النواة المركزية - Core Nuclei Section */}
                  {filteredCoreNuclei.length > 0 && (
                    <div className="mb-12">
                      <div className="mb-6 flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-primary">
                          النواة المركزية
                        </h2>
                        <span className="text-sm text-muted-foreground">// Core Nuclei</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCoreNuclei.map((platform) => (
                          <CoreNucleusCard
                            key={platform.id}
                            platform={platform}
                            onClick={() => setSelectedPlatform(platform)}
                            highlightedPlatform={highlightedPlatform}
                            onHighlightChange={setHighlightedPlatform}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* المنصات العادية - Regular Platforms Section */}
                  {filteredRegularPlatforms.length > 0 && (
                    <div>
                      <div className="mb-6 flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-foreground">
                          المنصات
                        </h2>
                        <span className="text-sm text-muted-foreground">// Platforms</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredRegularPlatforms.map((platform) => (
                          <SmartPlatformCard
                            key={platform.id}
                            platform={platform}
                            onClick={() => setSelectedPlatform(platform)}
                            highlightedPlatform={highlightedPlatform}
                            onHighlightChange={setHighlightedPlatform}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No platforms message */}
                  {filteredCoreNuclei.length === 0 && filteredRegularPlatforms.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No platforms found for filter: {filter}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <>
              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No tasks found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <>
              {integrationsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading integrations...</p>
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No integrations found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {integrations.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Deployments Tab */}
          {activeTab === 'deployments' && (
            <>
              {deploymentsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading deployments...</p>
                </div>
              ) : deployments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No deployments found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deployments.map((deployment) => (
                    <DeploymentCard key={deployment.id} deployment={deployment} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Connections Graph Tab - المرحلة 2 */}
          {activeTab === 'connections' && (
            <ConnectionsGraph
              platforms={platforms}
              onPlatformClick={(platform) => setSelectedPlatform(platform)}
            />
          )}

          {/* Metrics Tab - Phase 6 */}
          {activeTab === 'metrics' && (
            <MetricsDashboard />
          )}
        </div>
      </main>

      {/* Platform Details Modal - Enhanced المرحلة 1 */}
      {selectedPlatform && <PlatformDetailsModal platform={selectedPlatform} onClose={() => setSelectedPlatform(null)} />}
    </div>
  );
}

// Smart Platform Card Component
// Core Nucleus Card - أكبر وأبرز للنواة المركزية
function CoreNucleusCard({
  platform,
  onClick,
  highlightedPlatform,
  onHighlightChange,
}: {
  platform: Platform;
  onClick: () => void;
  highlightedPlatform: string | null;
  onHighlightChange: (platform: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  
  const isHighlighted = highlightedPlatform === platform.id;
  const isConnectedToHighlighted = highlightedPlatform && PLATFORM_CONNECTIONS[highlightedPlatform]?.includes(platform.id);
  
  const normalizedStatus = normalizeStatus(platform.status);
  const isAlive = normalizedStatus === 'healthy' || normalizedStatus === 'degraded';
  const isDead = normalizedStatus === 'offline';

  // أيقونات النواة المركزية
  const nucleusIcons: Record<string, string> = {
    'nicholas': '🧠', // Nicholas - المخ
    'side': '💻',     // SIDE - الكود
    'academy': '🤖',  // Academy - البوتات
    'matrix': '🏗️',  // Matrix - البناء
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className={`relative rounded-3xl border-2 backdrop-blur-md p-8 shadow-2xl transition-all duration-300 cursor-pointer ${
        isDead
          ? 'opacity-40 grayscale border-slate-600 bg-slate-900/30'
          : isHighlighted 
          ? 'border-primary bg-primary/30 shadow-primary/50 scale-105 hover:-translate-y-2 hover:shadow-3xl' 
          : isConnectedToHighlighted 
          ? 'border-cyan-400 bg-cyan-500/20 shadow-cyan-500/40 hover:-translate-y-2 hover:shadow-3xl'
          : 'border-primary/50 bg-card/60 hover:shadow-primary/20 hover:-translate-y-2 hover:shadow-3xl'
      }`}
      style={isAlive && !isDead ? {
        animation: 'platform-pulse 2.5s ease-in-out infinite',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.25), 0 0 60px rgba(0, 255, 255, 0.12)'
      } : undefined}
      data-testid={`core-nucleus-card-${platform.id}`}
    >
      {/* Header with Icon */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{nucleusIcons[platform.id]}</span>
            <div className="text-xl font-bold uppercase tracking-wider text-primary">
              {platform.displayName}
            </div>
          </div>
          {platform.arabicName && (
            <div className="text-base text-muted-foreground">{platform.arabicName}</div>
          )}
        </div>
      </div>

      {/* Connected Platforms */}
      <PlatformConnections 
        platformId={platform.id} 
        highlightedPlatform={highlightedPlatform}
        onHighlightChange={onHighlightChange}
      />

      {/* Hover Glow Effect */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 ${
          hover ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(800px 400px at 30% -10%, rgba(var(--primary-rgb, 0, 255, 255), 0.15), transparent), radial-gradient(800px 400px at 130% 110%, rgba(var(--accent-rgb, 255, 0, 255), 0.12), transparent)',
        }}
      />
    </div>
  );
}

function SmartPlatformCard({
  platform,
  onClick,
  highlightedPlatform,
  onHighlightChange,
}: {
  platform: Platform;
  onClick: () => void;
  highlightedPlatform: string | null;
  onHighlightChange: (platform: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  
  // Check if this platform is highlighted
  const isHighlighted = highlightedPlatform === platform.id;
  const isConnectedToHighlighted = highlightedPlatform && PLATFORM_CONNECTIONS[highlightedPlatform]?.includes(platform.id);
  const shouldGlow = isHighlighted || isConnectedToHighlighted;
  
  // Check if platform is alive (active/healthy)
  const normalizedStatus = normalizeStatus(platform.status);
  const isAlive = normalizedStatus === 'healthy' || normalizedStatus === 'degraded';
  const isDead = normalizedStatus === 'offline';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className={`relative rounded-2xl border backdrop-blur-md p-5 shadow-lg transition-all duration-300 cursor-pointer ${
        isDead
          ? 'opacity-40 grayscale border-slate-700 bg-slate-900/20' // ميتة - مطفية
          : isHighlighted 
          ? 'border-primary bg-primary/20 shadow-primary/30 scale-105 hover:-translate-y-1 hover:shadow-2xl' 
          : isConnectedToHighlighted 
          ? 'border-cyan-500 bg-cyan-500/10 shadow-cyan-500/20 hover:-translate-y-1 hover:shadow-2xl'
          : 'border-border bg-card/40 hover:shadow-primary/10 hover:-translate-y-1 hover:shadow-2xl'
      }`}
      style={isAlive && !isDead ? {
        animation: 'platform-pulse 3s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.15), 0 0 40px rgba(0, 255, 255, 0.08)'
      } : undefined}
      data-testid={`platform-card-${platform.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {platform.displayName}
          </div>
          {platform.arabicName && (
            <div className="text-xs text-muted-foreground mt-0.5">{platform.arabicName}</div>
          )}
        </div>
      </div>

      {/* Connected Platforms - Professional Style */}
      <PlatformConnections 
        platformId={platform.id} 
        highlightedPlatform={highlightedPlatform}
        onHighlightChange={onHighlightChange}
      />

      {/* Hover Glow Effect */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          hover ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(600px 300px at 20% -10%, rgba(var(--primary-rgb, 0, 255, 255), 0.08), transparent), radial-gradient(600px 300px at 120% 110%, rgba(var(--accent-rgb, 255, 0, 255), 0.08), transparent)',
        }}
      />
    </div>
  );
}

// HealthIndicator REMOVED - displayed mock health percentage data

// Stat Box Component
function StatBox({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'purple' | 'slate' }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    slate: 'text-slate-300',
  };

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${colorMap[tone]}`}>{value}</div>
    </div>
  );
}

// Platform Connections Map - Real connections based on code analysis
const PLATFORM_CONNECTIONS: Record<string, string[]> = {
  nicholas: ['side', 'matrix', 'academy', 'mailhub', 'customer-service', 'scp', 'docs', 'b2b', 'b2c', 'accounting', 'ce', 'secretary', 'wallet', 'multibot', 'v2-integration', 'intelligence-feed'],
  side: ['nicholas', 'academy', 'matrix'],
  matrix: ['nicholas', 'side'],
  academy: ['nicholas', 'side'],
  mailhub: ['nicholas'],
  'customer-service': ['nicholas'],
  scp: ['nicholas'],
  docs: ['nicholas'],
  b2b: ['nicholas'],
  b2c: ['nicholas'],
  accounting: ['nicholas'],
  ce: ['nicholas'],
  secretary: ['nicholas'],
  wallet: ['nicholas'],
  multibot: ['nicholas'],
  'v2-integration': ['nicholas'],
  'intelligence-feed': ['nicholas'],
};

// Connection Badge Component - Shows connected platforms
function ConnectionBadge({ 
  platformId,
  platformName, 
  status = 'connected',
  isHighlighted = false,
  onClick
}: { 
  platformId: string;
  platformName: string;
  status?: 'connected' | 'connecting' | 'disconnected';
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  const statusConfig = {
    connected: {
      bg: isHighlighted ? 'bg-cyan-500/30' : 'bg-green-500/10',
      border: isHighlighted ? 'border-cyan-400' : 'border-green-500/30',
      text: isHighlighted ? 'text-cyan-300' : 'text-green-400',
      dot: isHighlighted ? 'bg-cyan-400' : 'bg-green-400',
      pulse: isHighlighted ? 'animate-pulse shadow-lg shadow-cyan-500/50' : 'animate-pulse',
    },
    connecting: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      pulse: 'animate-[pulse_2s_ease-in-out_infinite]',
    },
    disconnected: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
      pulse: '',
    },
  };

  const config = statusConfig[status];

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border w-fit transition-all duration-300 cursor-pointer hover:scale-105 ${config.bg} ${config.border} ${
        isHighlighted ? 'scale-110 shadow-lg' : ''
      }`}
      data-testid={`badge-${platformId}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse}`}></div>
      <span className={`text-[10px] font-medium uppercase tracking-wider ${config.text}`}>
        {platformName}
      </span>
    </div>
  );
}

// Platform Connections Display - Shows all connected platforms for a given platform
function PlatformConnections({ 
  platformId,
  highlightedPlatform,
  onHighlightChange
}: { 
  platformId: string;
  highlightedPlatform: string | null;
  onHighlightChange: (platform: string | null) => void;
}) {
  const connections = PLATFORM_CONNECTIONS[platformId] || [];
  
  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid={`connections-${platformId}`}>
      {connections.map((connectedPlatform) => (
        <ConnectionBadge 
          key={connectedPlatform} 
          platformId={connectedPlatform}
          platformName={connectedPlatform === 'nicholas' ? 'Nicholas' : connectedPlatform.toUpperCase()}
          status="connected"
          isHighlighted={highlightedPlatform === connectedPlatform}
          onClick={() => {
            if (highlightedPlatform === connectedPlatform) {
              onHighlightChange(null); // Deselect if clicking same platform
            } else {
              onHighlightChange(connectedPlatform);
            }
          }}
        />
      ))}
    </div>
  );
}

// Platform Link Visualization Component
function PlatformLinkBadge({ link }: { link: PlatformLink }) {
  const healthColors: Record<NormalizedHealthStatus, { bg: string; border: string; text: string }> = {
    healthy: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    unhealthy: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
    },
    unknown: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-400',
    },
  };

  const normalizedHealth = normalizeHealthStatus(link.healthStatus);
  const colors = healthColors[normalizedHealth];
  
  const normalizedStrength = normalizeStrength(link.visualMetadata.strength);
  const strengthBars =
    normalizedStrength === 'strong'
      ? 4
      : normalizedStrength === 'normal'
      ? 3
      : normalizedStrength === 'weak'
      ? 2
      : 1;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${colors.bg} ${colors.border} ${colors.text}`}
      data-testid={`connection-badge-${link.id}`}
    >
      <span className="uppercase text-[10px]">{link.linkType.replace(/_/g, ' ')}</span>
      <span className="opacity-60">•</span>
      <span className="opacity-80 text-[10px]">{link.connectionProtocol}</span>
      <span className="ml-1 flex gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={`w-1 h-2 rounded-sm ${i < strengthBars ? 'bg-current' : 'bg-current/30'}`}
          ></span>
        ))}
      </span>
    </span>
  );
}

// Integration Badge Component
function IntegrationBadge({ integration }: { integration: PlatformIntegration }) {
  const healthColors: Record<NormalizedHealthStatus, { bg: string; border: string; text: string }> = {
    healthy: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-300',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
    },
    unhealthy: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-300',
    },
    unknown: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-300',
    },
  };

  const normalizedHealth = normalizeHealthStatus(integration.healthStatus);
  const colors = healthColors[normalizedHealth];

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs border ${colors.bg} ${colors.border} ${colors.text}`}
      data-testid={`integration-badge-${integration.id}`}
    >
      {integration.name}
    </span>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  ...props
}: {
  label: string;
  value: string;
  color: 'cyan' | 'green' | 'blue' | 'purple';
}) {
  const colorMap: Record<string, { glow: string; text: string }> = {
    cyan: { glow: 'shadow-cyan-500/20', text: 'text-cyan-400' },
    green: { glow: 'shadow-green-500/20', text: 'text-green-400' },
    blue: { glow: 'shadow-blue-500/20', text: 'text-blue-400' },
    purple: { glow: 'shadow-purple-500/20', text: 'text-purple-400' },
  };

  const colors = colorMap[color];

  return (
    <div
      className={`rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 shadow-lg ${colors.glow} hover:-translate-y-0.5 transition-transform`}
      {...props}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task }: { task: Task }) {
  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    completed: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
    },
    pending: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    failed: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
    },
    running: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
  };

  const status = task.status.toLowerCase();
  const colors = statusColors[status] || statusColors.pending;
  const timeAgo = new Date(task.createdAt).toLocaleString();

  return (
    <div
      className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:-translate-y-0.5 transition-all"
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {task.jobType.replace(/_/g, ' ')}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Nucleus: {task.nucleusId}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Created: {timeAgo}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${colors.bg} ${colors.border} ${colors.text}`}>
          {task.status}
        </span>
      </div>
    </div>
  );
}

// Integration Card Component
function IntegrationCard({ integration }: { integration: Integration }) {
  const healthColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    healthy: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      dot: 'bg-green-400',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    unhealthy: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
    unknown: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
    },
  };

  const health = integration.healthStatus.toLowerCase();
  const colors = healthColors[health] || healthColors.unknown;

  return (
    <div
      className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 shadow-lg hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all"
      data-testid={`integration-card-${integration.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {integration.name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Provider: {integration.provider}
          </div>
        </div>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${colors.bg}`}>
          <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></div>
          <div className={`text-xs font-medium ${colors.text}`}>{integration.healthStatus}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
          {integration.status}
        </span>
        {integration.category && (
          <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
            {integration.category}
          </span>
        )}
      </div>
    </div>
  );
}

// Deployment Card Component
function DeploymentCard({ deployment }: { deployment: Deployment }) {
  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
    },
    pending: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    failed: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
    },
    running: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
  };

  const status = deployment.status.toLowerCase();
  const colors = statusColors[status] || statusColors.pending;
  const createdAt = new Date(deployment.createdAt).toLocaleString();
  const deployedAt = deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleString() : 'Not deployed';

  return (
    <div
      className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:-translate-y-0.5 transition-all"
      data-testid={`deployment-card-${deployment.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {deployment.nucleusId}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Version: {deployment.version}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Created: {createdAt}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Deployed: {deployedAt}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${colors.bg} ${colors.border} ${colors.text}`}>
          {deployment.status}
        </span>
      </div>
    </div>
  );
}

// Deployment Controls Component - Phase 5
function DeploymentControls({ platform }: { platform: Platform }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Start mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/integration-hub/platforms/${platform.id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/stats'] });
      toast({
        title: 'Platform Started',
        description: `${platform.displayName} is now running.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Start Failed',
        description: error.message || 'Failed to start platform',
        variant: 'destructive',
      });
    },
  });
  
  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/integration-hub/platforms/${platform.id}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/stats'] });
      toast({
        title: 'Platform Stopped',
        description: `${platform.displayName} has been stopped.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Stop Failed',
        description: error.message || 'Failed to stop platform',
        variant: 'destructive',
      });
    },
  });
  
  // Restart mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/integration-hub/platforms/${platform.id}/restart`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/stats'] });
      toast({
        title: 'Platform Restarted',
        description: `${platform.displayName} has been restarted.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Restart Failed',
        description: error.message || 'Failed to restart platform',
        variant: 'destructive',
      });
    },
  });
  
  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/integration-hub/platforms/${platform.id}/deploy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/stats'] });
      toast({
        title: 'Deployment Initiated',
        description: `${platform.displayName} deployment started.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Deploy Failed',
        description: error.message || 'Failed to deploy platform',
        variant: 'destructive',
      });
    },
  });
  
  const isAnyPending = startMutation.isPending || stopMutation.isPending || restartMutation.isPending || deployMutation.isPending;
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        onClick={() => startMutation.mutate()}
        disabled={isAnyPending || platform.status === 'running'}
        variant="outline"
        className="border-green-500/50 hover:bg-green-500/10 hover:border-green-500"
        data-testid="button-start-platform"
      >
        {startMutation.isPending ? 'Starting...' : 'Start'}
      </Button>
      
      <Button
        onClick={() => stopMutation.mutate()}
        disabled={isAnyPending || platform.status === 'stopped'}
        variant="outline"
        className="border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
        data-testid="button-stop-platform"
      >
        {stopMutation.isPending ? 'Stopping...' : 'Stop'}
      </Button>
      
      <Button
        onClick={() => restartMutation.mutate()}
        disabled={isAnyPending}
        variant="outline"
        className="border-yellow-500/50 hover:bg-yellow-500/10 hover:border-yellow-500"
        data-testid="button-restart-platform"
      >
        {restartMutation.isPending ? 'Restarting...' : 'Restart'}
      </Button>
      
      <Button
        onClick={() => deployMutation.mutate()}
        disabled={isAnyPending}
        variant="outline"
        className="border-blue-500/50 hover:bg-blue-500/10 hover:border-blue-500"
        data-testid="button-deploy-platform"
      >
        {deployMutation.isPending ? 'Deploying...' : 'Deploy'}
      </Button>
    </div>
  );
}

// Platform Details Modal - المرحلة 1: Enhanced Modal
function PlatformDetailsModal({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'health' | 'logs' | 'links' | 'config'>('overview');

  // Fetch sanitized activity logs for this platform (PUBLIC endpoint - no sensitive data)
  const { data: auditLogsData } = useQuery<{ success: boolean; data: IntegrationAuditLog[] }>({
    queryKey: [`/api/integration-hub/platforms/${platform.id}/activity`],
    enabled: activeDetailTab === 'logs',
  });

  const normalizedStatus = normalizeStatus(platform.status);
  const isHealthy = normalizedStatus === 'healthy';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
      onClick={onClose}
      data-testid="modal-platform-details"
    >
      <div
        className="bg-card/95 backdrop-blur-sm border-2 border-primary/30 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-6 border-b border-primary/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {platform.displayName}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  isHealthy 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-red-500/20 border-red-500/50 text-red-400'
                }`}>
                  {platform.status}
                </span>
              </div>
              <p className="text-lg text-muted-foreground mb-1">{platform.arabicName}</p>
              <p className="text-sm text-muted-foreground/80">{platform.description}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-destructive/20 rounded-lg transition-colors border border-border hover:border-destructive/50"
              data-testid="button-close-modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 px-6 pt-4 border-b border-border/50">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'health', label: 'Health', icon: '💚' },
            { id: 'logs', label: 'Activity', icon: '📜' },
            { id: 'links', label: 'Connections', icon: '🔗' },
            { id: 'config', label: 'Config', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id as typeof activeDetailTab)}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeDetailTab === tab.id
                  ? 'bg-primary/20 border-b-2 border-primary text-primary font-semibold'
                  : 'hover:bg-accent/10 text-muted-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Overview Tab */}
          {activeDetailTab === 'overview' && (
            <div className="space-y-4">
              {/* Deployment Controls - Phase 5 */}
              <InfoCard title="Deployment Controls" icon="">
                <DeploymentControls platform={platform} />
              </InfoCard>

              <InfoCard title="Platform Identity" icon="🆔">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <span className="ml-2 font-mono text-xs bg-accent/10 px-2 py-1 rounded">{platform.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-semibold text-primary">{platform.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="ml-2">{new Date(platform.registeredAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Active:</span>
                    <span className="ml-2">{platform.lastActive ? new Date(platform.lastActive).toLocaleString('ar-EG') : 'لم يتصل بعد'}</span>
                  </div>
                </div>
              </InfoCard>

              <InfoCard title="Authentication & Security" icon="🔐">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auth Mode:</span>
                    <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">{platform.authMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate Limit:</span>
                    <span className="font-semibold">{platform.rateLimitRPM} RPM</span>
                  </div>
                </div>
              </InfoCard>
            </div>
          )}

          {/* Health Tab */}
          {activeDetailTab === 'health' && (
            <div className="space-y-4">
              <InfoCard title="Health Metrics" icon="💚">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">
                    {isHealthy ? '✅' : '⚠️'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {isHealthy ? 'Platform Healthy' : 'Needs Attention'}
                  </h3>
                  <p className="text-muted-foreground">
                    Status: <span className="font-semibold text-primary">{platform.status}</span>
                  </p>
                </div>
              </InfoCard>

              <InfoCard title="Metrics Collection" icon="📈">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Advanced metrics collection will be available in Phase 6: Advanced Monitoring
                </p>
              </InfoCard>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeDetailTab === 'logs' && (
            <div className="space-y-4">
              <InfoCard title="Recent Activity" icon="📜">
                {auditLogsData?.data && auditLogsData.data.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogsData.data.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg border border-border/50">
                        <span className="text-2xl">
                          {log.status === 'SUCCESS' ? '✅' : '❌'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{log.action}</span>
                            <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Resource: {log.resource} ({log.resourceId})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No activity logs available</p>
                )}
              </InfoCard>
            </div>
          )}

          {/* Connections Tab */}
          {activeDetailTab === 'links' && (
            <div className="space-y-4">
              <InfoCard title="Platform Connections" icon="🔗">
                {platform.links && platform.links.length > 0 ? (
                  <div className="space-y-3">
                    {platform.links.map((link) => {
                      const linkHealth = normalizeHealthStatus(link.healthStatus);
                      return (
                        <div key={link.id} className="p-4 bg-accent/5 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">→ {link.targetPlatformId}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              linkHealth === 'healthy' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {link.healthStatus}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>Type: {link.linkType}</div>
                            <div>Protocol: {link.connectionProtocol}</div>
                            <div>Status: {link.status}</div>
                            <div>Strength: {link.visualMetadata.strength}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No connections configured</p>
                )}
              </InfoCard>
            </div>
          )}

          {/* Configuration Tab */}
          {activeDetailTab === 'config' && (
            <div className="space-y-4">
              <InfoCard title="Platform Configuration" icon="⚙️">
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block mb-1">Platform ID:</span>
                      <code className="text-xs bg-accent/10 px-2 py-1 rounded block">{platform.id}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Platform Type:</span>
                      <code className="text-xs bg-accent/10 px-2 py-1 rounded block">{platform.type}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Auth Mode:</span>
                      <code className="text-xs bg-accent/10 px-2 py-1 rounded block">{platform.authMode}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Rate Limit:</span>
                      <code className="text-xs bg-accent/10 px-2 py-1 rounded block">{platform.rateLimitRPM} RPM</code>
                    </div>
                  </div>
                </div>
              </InfoCard>

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg font-semibold transition-all" data-testid="button-refresh-platform">
                  🔄 Refresh Platform
                </button>
                <button className="flex-1 px-4 py-3 bg-accent/20 hover:bg-accent/30 border border-accent/50 rounded-lg font-semibold transition-all" data-testid="button-edit-config">
                  ✏️ Edit Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Connections Graph - المرحلة 2: خريطة تفاعلية حية
// ═══════════════════════════════════════════════════════════

interface ConnectionsGraphProps {
  platforms: Platform[];
  onPlatformClick: (platform: Platform) => void;
}

function ConnectionsGraph({ platforms, onPlatformClick }: ConnectionsGraphProps) {
  // Fetch connections data
  const { data: connectionsData, isLoading } = useQuery<{
    success: boolean;
    data: {
      platforms: Platform[];
      links: any[];
      autoGenerated?: boolean;
    };
  }>({
    queryKey: ['/api/integration-hub/connections/graph'],
    refetchInterval: 15000,
  });

  const connections = connectionsData?.data;

  // Create nodes from platforms
  const initialNodes: Node[] = useMemo(() => {
    if (!platforms.length) return [];

    const centerX = 500;
    const centerY = 400;
    const radiusCore = 120; // Core nuclei closer to center
    const radiusRegular = 300; // Regular platforms further out

    return platforms.map((platform, index) => {
      const isCore = CORE_NUCLEI_IDS.includes(platform.id);
      const normalizedStatus = normalizeStatus(platform.status);
      const isHealthy = normalizedStatus === 'healthy';

      // Position calculation
      let x, y;
      if (platform.id === 'nicholas') {
        // Nicholas in the center
        x = centerX;
        y = centerY;
      } else if (isCore) {
        // Other core nuclei in inner circle
        const coreIndex = CORE_NUCLEI_IDS.indexOf(platform.id);
        const angle = (coreIndex * Math.PI * 2) / 4;
        x = centerX + radiusCore * Math.cos(angle);
        y = centerY + radiusCore * Math.sin(angle);
      } else {
        // Regular platforms in outer circle
        const regularPlatforms = platforms.filter(p => !CORE_NUCLEI_IDS.includes(p.id));
        const regularIndex = regularPlatforms.findIndex(p => p.id === platform.id);
        const angle = (regularIndex * Math.PI * 2) / regularPlatforms.length;
        x = centerX + radiusRegular * Math.cos(angle);
        y = centerY + radiusRegular * Math.sin(angle);
      }

      return {
        id: platform.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div
              className={`px-4 py-3 rounded-xl border-2 ${
                isCore ? 'min-w-[120px]' : 'min-w-[100px]'
              } text-center cursor-pointer transition-all ${
                isHealthy
                  ? 'bg-primary/20 border-primary/50 hover:bg-primary/30'
                  : 'bg-muted/20 border-muted-foreground/20 hover:bg-muted/30 opacity-60'
              }`}
              onClick={() => onPlatformClick(platform)}
            >
              <div className={`font-bold ${isCore ? 'text-base' : 'text-sm'}`}>
                {platform.displayName}
              </div>
              {platform.arabicName && (
                <div className="text-xs text-muted-foreground mt-1">{platform.arabicName}</div>
              )}
              <div className="mt-1">
                {isHealthy ? (
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                ) : (
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </div>
            </div>
          ),
        },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  }, [platforms, onPlatformClick]);

  // Create edges from connections
  const initialEdges: Edge[] = useMemo(() => {
    if (!connections?.links) return [];

    return connections.links.map((link, index) => {
      const isHealthy = link.healthStatus?.toLowerCase() === 'healthy';
      
      return {
        id: `${link.sourcePlatformId}-${link.targetPlatformId}-${index}`,
        source: link.sourcePlatformId,
        target: link.targetPlatformId,
        type: 'smoothstep',
        animated: isHealthy,
        style: {
          stroke: isHealthy ? 'rgba(0, 255, 255, 0.5)' : 'rgba(128, 128, 128, 0.3)',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: isHealthy ? 'rgba(0, 255, 255, 0.5)' : 'rgba(128, 128, 128, 0.3)',
        },
      };
    });
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading connections graph...</p>
      </div>
    );
  }

  return (
    <div className="h-[700px] bg-background/50 border border-border/50 rounded-xl overflow-hidden" data-testid="connections-graph">
      <div className="p-4 border-b border-border/50 bg-accent/5">
        <h3 className="text-lg font-semibold">🌐 Platform Connections Graph</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive visualization of {platforms.length} platforms and {connections?.links?.length || 0} connections
          {connections?.autoGenerated && ' (auto-generated)'}
        </p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        className="bg-background/20"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#00ffff" gap={20} className="opacity-10" />
        <Controls className="bg-accent/80 border border-border/50 rounded-lg" />
        <MiniMap
          className="bg-accent/80 border border-border/50 rounded-lg"
          nodeColor={(node) => {
            const platform = platforms.find(p => p.id === node.id);
            if (!platform) return '#666';
            const isHealthy = normalizeStatus(platform.status) === 'healthy';
            return isHealthy ? '#00ffff' : '#666';
          }}
        />
      </ReactFlow>
    </div>
  );
}

// Helper Component: Info Card
function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-accent/5 border border-border/50 rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Background Grid Component
function BackgroundGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Nebula gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 700px at 20% 20%, rgba(var(--primary-rgb, 0, 255, 255), 0.15), transparent),' +
            'radial-gradient(900px 600px at 80% 30%, rgba(var(--accent-rgb, 255, 0, 255), 0.10), transparent),' +
            'radial-gradient(1000px 800px at 50% 80%, rgba(0, 150, 255, 0.10), transparent)',
          filter: 'saturate(1.2)',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(var(--foreground-rgb, 255,255,255), 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--foreground-rgb, 255,255,255), 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Scan lines */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(transparent 50%, rgba(var(--foreground-rgb, 255,255,255), 0.5) 50%)',
          backgroundSize: '100% 4px',
          animation: 'scan 8s linear infinite',
        }}
      />
    </div>
  );
}
