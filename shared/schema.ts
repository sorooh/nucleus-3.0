import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, real, numeric, unique, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Enhanced for Auth System
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default('user'), // admin, manager, user, bot
  isActive: integer("is_active").notNull().default(1), // 1=active, 0=disabled
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sessions table - Auth System
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Permissions - Auth System
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull().unique(), // admin, manager, user, bot
  permissions: jsonb("permissions").notNull(), // { nucleus: true, bots: true, platforms: false, ... }
  createdAt: timestamp("created_at").defaultNow(),
});

// Brain Core Layers
export const brainLayers = pgTable("brain_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // perception, analysis, reasoning, creativity, learning, memory, synthesis
  status: text("status").notNull().default('active'), // active, processing, idle, error
  performance: integer("performance").notNull().default(100), // 0-100
  lastActivity: timestamp("last_activity").defaultNow(),
});

// Bots
export const bots = pgTable("bots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  arabicName: text("arabic_name").notNull(),
  category: text("category").notNull(), // products, markets, languages, platforms, technical
  specialization: text("specialization").notNull(),
  rank: text("rank").notNull(), // beginner, intermediate, advanced, expert, legendary
  status: text("status").notNull().default('active'), // active, sleeping, error, maintenance
  performance: integer("performance").notNull().default(100), // 0-100
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platforms
export const platforms = pgTable("platforms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  arabicName: text("arabic_name").notNull(),
  type: text("type").notNull(), // b2b, b2c, shipping, inventory, accounting, ce, secretary, wallet
  status: text("status").notNull().default('healthy'), // healthy, warning, critical, offline
  health: integer("health").notNull().default(100), // 0-100
  lastSync: timestamp("last_sync").defaultNow(),
});

// ============= UNIFIED GATEWAY - PLATFORM REGISTRY =============

/**
 * Platform Registry - السجل المركزي للمنصات (الوزارات الرقمية)
 * كل منصة/وزارة يجب تسجيلها هنا قبل الاتصال بالنواة
 */
export const platformRegistry = pgTable("platform_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Platform Identity
  platformId: text("platform_id").notNull().unique(), // codemaster, designer, academy, mailhub
  displayName: text("display_name").notNull(), // "CodeMaster Platform"
  arabicName: text("arabic_name"), // "منصة كود ماستر"
  platformType: text("platform_type").notNull(), // CODEMASTER, DESIGNER, ACADEMY, MAIL_HUB, etc.
  ownerTeam: text("owner_team"), // "Development Team", "Design Team"
  description: text("description"), // وصف المنصة
  
  // Authentication Mode
  authMode: text("auth_mode").notNull().default('INTERNAL_JWT'), // INTERNAL_JWT, ENHANCED (JWT+HMAC)
  
  // Security Credentials (مُشفّرة)
  apiKey: text("api_key"), // للـ ENHANCED mode
  hmacSecret: text("hmac_secret"), // للـ ENHANCED mode
  jwtSecret: text("jwt_secret"), // للـ JWT
  
  // Authorization & Scopes
  allowedEndpoints: jsonb("allowed_endpoints").notNull().default('[]'), // ['/api/uil/*', '/api/gateway/code/*']
  dataScopes: jsonb("data_scopes").notNull().default('[]'), // ['memory:read', 'nucleus:analyze', 'ai:generate']
  rbacRole: text("rbac_role").default('platform'), // admin, platform, service, bot
  
  // Rate Limiting
  rateLimitRPM: integer("rate_limit_rpm").notNull().default(100), // requests per minute
  rateLimitRPH: integer("rate_limit_rph").notNull().default(1000), // requests per hour
  rateLimitRPD: integer("rate_limit_rpd").default(10000), // requests per day
  
  // Platform Status
  isActive: integer("is_active").notNull().default(1), // 1=active, 0=disabled
  status: text("status").notNull().default('registered'), // registered, active, suspended, archived
  
  // Network & Security
  allowedIPs: jsonb("allowed_ips"), // ['192.168.1.0/24', '10.0.0.1']
  webhookUrl: text("webhook_url"), // للإشعارات
  
  // Observability
  telemetryEnabled: integer("telemetry_enabled").notNull().default(1), // 1=enabled
  traceLevel: text("trace_level").default('INFO'), // DEBUG, INFO, WARN, ERROR
  
  // Metadata
  metadata: jsonb("metadata"), // extra configuration
  tags: jsonb("tags"), // ['production', 'critical', 'external']
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  lastKeyRotation: timestamp("last_key_rotation"),
  lastActive: timestamp("last_active"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Platform Deployment History - سجل نشر المنصات
 * Tracks deployment commands and their execution outcomes
 */
export const platformDeploymentHistory = pgTable("platform_deployment_history", {
  id: serial("id").primaryKey(),
  platformId: text("platform_id").notNull().references(() => platformRegistry.platformId, { onDelete: 'cascade' }),
  
  // Command Info
  command: text("command").notNull(), // start, stop, restart, deploy, health
  status: text("status").notNull(), // pending, running, success, failed
  
  // Execution Details
  triggeredBy: text("triggered_by").default('system'), // user, system, scheduler
  metadata: jsonb("metadata").default('{}'), // command parameters, deployment config
  errorMessage: text("error_message"),
  
  // Timestamps
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

/**
 * Platform Metrics - مقاييس أداء المنصات
 * Real-time performance metrics for platform monitoring
 * Phase 6: Advanced Monitoring & Metrics
 */
export const platformMetrics = pgTable("platform_metrics", {
  id: serial("id").primaryKey(),
  platformId: text("platform_id").notNull().references(() => platformRegistry.platformId, { onDelete: 'cascade' }),
  
  // Performance Metrics
  cpuUsage: real("cpu_usage"), // CPU usage percentage (0-100)
  memoryUsage: real("memory_usage"), // Memory usage percentage (0-100)
  memoryMb: real("memory_mb"), // Memory in MB
  networkIn: real("network_in"), // Network incoming MB/s
  networkOut: real("network_out"), // Network outgoing MB/s
  responseTime: integer("response_time"), // Response time in ms
  
  // Health Status
  isHealthy: boolean("is_healthy").default(true),
  errorCount: integer("error_count").default(0),
  
  // Metadata
  metadata: jsonb("metadata").default('{}'), // Additional metrics, custom data
  
  // Timestamp
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Conversations for Learning (Legacy - keeping for backward compatibility)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context"), // store learning context
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat Threads - Modern Chat System
export const chatThreads = pgTable("chat_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"), // optional thread title
  type: text("type").notNull().default('direct'), // direct, group, assistant
  participants: jsonb("participants").notNull(), // array of user IDs
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  status: text("status").notNull().default('active'), // active, archived, deleted
  metadata: jsonb("metadata"), // extra data (pinned, muted, etc)
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat Messages - Modern Chat System
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default('text'), // text, file, image, system, ai_response
  status: text("status").notNull().default('sent'), // sent, delivered, read, failed
  replyToId: varchar("reply_to_id"), // for threaded replies
  metadata: jsonb("metadata"), // mentions, reactions, edit history
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});

// Chat Attachments - Modern Chat System  
export const chatAttachments = pgTable("chat_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // image/jpeg, application/pdf, etc
  fileSize: integer("file_size").notNull(), // in bytes
  fileUrl: text("file_url").notNull(), // path to uploaded file
  thumbnailUrl: text("thumbnail_url"), // for images/videos
  mimeType: text("mime_type").notNull(),
  uploadStatus: text("upload_status").notNull().default('completed'), // uploading, completed, failed
  metadata: jsonb("metadata"), // dimensions for images, duration for videos
  createdAt: timestamp("created_at").defaultNow(),
});

// System Logs
export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // info, warning, error, success
  source: text("source").notNull(), // brain, bot, platform, system
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge Feed History - نظام تغذية المعرفة
export const knowledgeFeeds = pgTable("knowledge_feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // txt, md, pdf, docx
  fileSize: integer("file_size").notNull(), // in bytes
  uploaderId: varchar("uploader_id").references(() => users.id),
  uploaderName: text("uploader_name").notNull(),
  status: text("status").notNull().default('queued'), // queued, processing, completed, error
  chunksCount: integer("chunks_count").notNull().default(0),
  summary: text("summary"),
  contentHash: text("content_hash").notNull().unique(), // لمنع التكرار
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"), // in milliseconds
  metadata: jsonb("metadata"), // additional data
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// MultiBot Agents - نظام البوتات الخارجية
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uuid: text("uuid").notNull().unique(), // Bot's unique identifier
  unit: text("unit").notNull(), // ACCOUNTING, B2B, B2C, SHIPPING, etc.
  agentType: text("agent_type").notNull(), // manager, support, maintenance
  name: text("name").notNull(),
  source: text("source").notNull().default('unknown'), // B2B, B2C, CE, Accounting, Shipping, Nucleus_Internal, External
  ip: text("ip"),
  status: text("status").notNull().default('active'), // active, disconnected, reconnecting
  lastPing: timestamp("last_ping").defaultNow(),
  activatedAt: timestamp("activated_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
  metadata: jsonb("metadata"), // additional bot info
});

// Permission Requests - طلبات الإذن من البوتات
export const permissionRequests = pgTable("permission_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: text("request_id").notNull().unique(), // من البوت
  agentId: varchar("agent_id").notNull().references(() => agents.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // MEMORY_CLEANUP, RESTART_SERVICE, etc.
  details: jsonb("details").notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, denied
  approvedBy: varchar("approved_by").references(() => users.id),
  denialReason: text("denial_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Agent Commands - أوامر النواة للبوتات
export const agentCommands = pgTable("agent_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commandId: text("command_id").notNull().unique(),
  agentId: varchar("agent_id").notNull().references(() => agents.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // START_BOT, STOP_BOT, RESTART_BOT, EXECUTE_TASK, etc.
  payload: jsonb("payload"),
  status: text("status").notNull().default('sent'), // sent, acknowledged, executed, failed
  result: jsonb("result"), // نتيجة التنفيذ
  issuedBy: varchar("issued_by").references(() => users.id),
  signature: text("signature").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  executedAt: timestamp("executed_at"),
});

// Customer Service Conversations - محادثات خدمة العملاء
export const customerConversations = pgTable("customer_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountName: text("account_name").notNull(), // PLUTO, MARS, etc.
  sourceType: text("source_type").notNull(), // text, image
  originalMessage: text("original_message").notNull(),
  classifiedTopic: text("classified_topic").notNull(), // "تأخير شحن", "منتج تالف", etc.
  suggestedReply: text("suggested_reply").notNull(),
  finalReply: text("final_reply").notNull(),
  feedback: text("feedback").notNull().default('pending'), // approved, edited, pending
  messageTimestamp: timestamp("message_timestamp").notNull(), // وقت الرسالة الأصلية
  metadata: jsonb("metadata"), // additional data (customer info, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  lastLogin: true, 
  createdAt: true 
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBrainLayerSchema = createInsertSchema(brainLayers).omit({ id: true, lastActivity: true });
export const insertBotSchema = createInsertSchema(bots).omit({ id: true, createdAt: true });
export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true, lastSync: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });

export const insertKnowledgeFeedSchema = createInsertSchema(knowledgeFeeds).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true
});

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true
});

export const insertChatAttachmentSchema = createInsertSchema(chatAttachments).omit({
  id: true,
  createdAt: true
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  activatedAt: true,
  lastPing: true,
  disconnectedAt: true
});

export const insertPermissionRequestSchema = createInsertSchema(permissionRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true
});

export const insertAgentCommandSchema = createInsertSchema(agentCommands).omit({
  id: true,
  createdAt: true,
  executedAt: true
});

export const insertCustomerConversationSchema = createInsertSchema(customerConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type BrainLayer = typeof brainLayers.$inferSelect;
export type InsertBrainLayer = z.infer<typeof insertBrainLayerSchema>;

export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;

export type Platform = typeof platforms.$inferSelect;
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export type KnowledgeFeed = typeof knowledgeFeeds.$inferSelect;
export type InsertKnowledgeFeed = z.infer<typeof insertKnowledgeFeedSchema>;

export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type ChatAttachment = typeof chatAttachments.$inferSelect;
export type InsertChatAttachment = z.infer<typeof insertChatAttachmentSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type PermissionRequest = typeof permissionRequests.$inferSelect;
export type InsertPermissionRequest = z.infer<typeof insertPermissionRequestSchema>;

export type AgentCommand = typeof agentCommands.$inferSelect;
export type InsertAgentCommand = z.infer<typeof insertAgentCommandSchema>;

export type CustomerConversation = typeof customerConversations.$inferSelect;
export type InsertCustomerConversation = z.infer<typeof insertCustomerConversationSchema>;

// ============= INTELLIGENT LEARNING SYSTEM =============

// Decision Logs - تسجيل كل قرار تتخذه النواة
export const decisionLogs = pgTable("decision_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  decisionType: text("decision_type").notNull(), // analysis, action, recommendation, routing
  source: text("source").notNull(), // nucleus, bot, platform, user
  sourceId: varchar("source_id"), // ID of bot/platform/user
  context: jsonb("context").notNull(), // input data, situation
  decision: jsonb("decision").notNull(), // what was decided
  confidence: integer("confidence").notNull().default(50), // 0-100
  reasoning: text("reasoning"), // why this decision
  expectedOutcome: text("expected_outcome"), // what we expect
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Decision Feedback - تقييم نتائج القرارات
export const decisionFeedback = pgTable("decision_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  decisionId: varchar("decision_id").notNull().references(() => decisionLogs.id, { onDelete: 'cascade' }),
  actualOutcome: text("actual_outcome").notNull(), // what actually happened
  success: text("success").notNull(), // success, partial, failure
  impactScore: integer("impact_score").notNull(), // -100 to +100
  lesson: text("lesson"), // what did we learn
  adjustmentNeeded: text("adjustment_needed"), // what to change next time
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Learning Cycles - دورات التعلم المستمر
export const learningCycles = pgTable("learning_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleNumber: integer("cycle_number").notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  totalDecisions: integer("total_decisions").notNull().default(0),
  successfulDecisions: integer("successful_decisions").notNull().default(0),
  averageConfidence: integer("average_confidence").notNull().default(0), // 0-100
  averageImpact: integer("average_impact").notNull().default(0), // -100 to +100
  patternsDiscovered: jsonb("patterns_discovered"), // new patterns found
  improvementsApplied: jsonb("improvements_applied"), // what changed
  status: text("status").notNull().default('active'), // active, completed, archived
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Shared Learnings - المعرفة المشتركة بين البوتات
export const sharedLearnings = pgTable("shared_learnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // translation, pricing, routing, analysis
  pattern: text("pattern").notNull(), // the learned pattern
  description: text("description").notNull(),
  confidence: integer("confidence").notNull().default(50), // 0-100
  usageCount: integer("usage_count").notNull().default(0), // how many times used
  successRate: integer("success_rate").notNull().default(0), // 0-100
  contributorBots: jsonb("contributor_bots").notNull(), // which bots contributed
  examples: jsonb("examples"), // example cases
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for learning system
export const insertDecisionLogSchema = createInsertSchema(decisionLogs).omit({
  id: true,
  createdAt: true
});

export const insertDecisionFeedbackSchema = createInsertSchema(decisionFeedback).omit({
  id: true,
  createdAt: true
});

export const insertLearningCycleSchema = createInsertSchema(learningCycles).omit({
  id: true,
  startedAt: true,
  completedAt: true
});

export const insertSharedLearningSchema = createInsertSchema(sharedLearnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for learning system
export type DecisionLog = typeof decisionLogs.$inferSelect;
export type InsertDecisionLog = z.infer<typeof insertDecisionLogSchema>;

export type DecisionFeedback = typeof decisionFeedback.$inferSelect;
export type InsertDecisionFeedback = z.infer<typeof insertDecisionFeedbackSchema>;

export type LearningCycle = typeof learningCycles.$inferSelect;
export type InsertLearningCycle = z.infer<typeof insertLearningCycleSchema>;

export type SharedLearning = typeof sharedLearnings.$inferSelect;
export type InsertSharedLearning = z.infer<typeof insertSharedLearningSchema>;

// ============= UNIFIED GATEWAY TYPES =============

export const insertPlatformRegistrySchema = createInsertSchema(platformRegistry).omit({
  id: true,
  registeredAt: true,
  updatedAt: true,
  lastActive: true,
});

export type PlatformRegistry = typeof platformRegistry.$inferSelect;
export type InsertPlatformRegistry = z.infer<typeof insertPlatformRegistrySchema>;

// Platform Deployment History Schemas
export const insertPlatformDeploymentHistorySchema = createInsertSchema(platformDeploymentHistory).omit({
  id: true,
  timestamp: true,
});

export type PlatformDeploymentHistory = typeof platformDeploymentHistory.$inferSelect;

// Platform Metrics Schemas
export const insertPlatformMetricsSchema = createInsertSchema(platformMetrics).omit({
  id: true,
  timestamp: true,
});

export type PlatformMetrics = typeof platformMetrics.$inferSelect;
export type InsertPlatformMetrics = z.infer<typeof insertPlatformMetricsSchema>;
export type InsertPlatformDeploymentHistory = z.infer<typeof insertPlatformDeploymentHistorySchema>;

// ============= FEDERATION NODES - SUROOH SIDE INTEGRATION =============

/**
 * Federation Nodes - عقد الشبكة الفيدرالية (SIDE وغيرها)
 * Nicholas 3.2 يستقبل ويدير العقد الفيدرالية لتبادل المعرفة والتزامن
 */
export const federationNodes = pgTable("federation_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Node Identity
  nodeId: text("node_id").notNull().unique(), // side-node-1, accounting-node-1
  nodeName: text("node_name").notNull(), // "Surooh SIDE - Main"
  arabicName: text("arabic_name"), // "سِيدا - النواة الأم"
  nodeType: text("node_type").notNull(), // development, accounting, legal, design, medical
  
  // Organization & Hierarchy
  organizationId: text("organization_id").notNull().default('surooh-holding'), // surooh-holding
  parentNodeId: text("parent_node_id"), // للنوى الفرعية
  nucleusLevel: text("nucleus_level").notNull(), // main, sub
  
  // Connection Details
  nodeUrl: text("node_url").notNull(), // https://side.sorooh.ai
  wsUrl: text("ws_url"), // wss://side.sorooh.ai/federation
  apiVersion: text("api_version").notNull().default('v1'),
  
  // Authentication
  authToken: text("auth_token").notNull(), // JWT token للاتصال
  hmacSecret: text("hmac_secret"), // HMAC secret للتوقيع
  publicKey: text("public_key"), // للتشفير
  
  // Authorization
  permissions: jsonb("permissions").notNull().default('[]'), // ['code:sync', 'knowledge:share', 'protocol:update']
  allowedEndpoints: jsonb("allowed_endpoints").notNull().default('[]'), // ['/api/federation/sync/*']
  governanceLevel: text("governance_level").notNull().default('standard'), // standard, trusted, restricted
  
  // Status & Health
  status: text("status").notNull().default('pending'), // pending, active, syncing, offline, suspended
  health: integer("health").notNull().default(100), // 0-100
  lastHeartbeat: timestamp("last_heartbeat"),
  lastSync: timestamp("last_sync"),
  
  // SIDE Integration
  sideVersion: text("side_version"), // v1.0.0
  codeSignature: text("code_signature"), // Surooh DNA signature
  syncProtocol: text("sync_protocol").notNull().default('realtime'), // realtime, periodic, manual
  
  // Metadata
  capabilities: jsonb("capabilities"), // {code_sync: true, knowledge_sharing: true, ai_bridge: true}
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'), // ['production', 'critical', 'development']
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Federation Sync Logs - سجلات التزامن بين النوى
 */
export const federationSyncLogs = pgTable("federation_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nodeId: text("node_id").notNull(), // reference to federation_nodes.nodeId
  syncType: text("sync_type").notNull(), // code, knowledge, protocol, schema
  direction: text("direction").notNull(), // incoming, outgoing
  
  status: text("status").notNull(), // success, failed, partial
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  
  payload: jsonb("payload"), // البيانات المزامنة
  errorMessage: text("error_message"),
  
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

/**
 * Federation Sync Data - بيانات المزامنة المُستلمة من العقد
 * جدول متخصص لحفظ البيانات المُزامنة مع checksum verification
 */
export const federationSyncData = pgTable("federation_sync_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nodeId: text("node_id").notNull(), // reference to federation_nodes.nodeId
  syncId: text("sync_id").notNull().unique(), // sync-{timestamp}-{random}
  syncType: text("sync_type").notNull(), // knowledge, code, schema, config
  direction: text("direction").notNull().default('inbound'), // inbound (from SIDE), outbound (to SIDE)
  
  data: jsonb("data").notNull(), // البيانات المُزامنة (items array)
  metadata: jsonb("metadata").notNull(), // {source, timestamp, version, checksum}
  checksum: text("checksum").notNull(), // SHA-256 hash للبيانات
  
  status: text("status").notNull().default('received'), // received, verified, processed, failed
  processed: integer("processed").notNull().default(0), // 0=false, 1=true
  errorMessage: text("error_message"),
  
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

/**
 * Federation Auth Tokens - رموز المصادقة للعقد
 */
export const federationAuthTokens = pgTable("federation_auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nodeId: text("node_id").notNull(),
  tokenHash: text("token_hash").notNull(), // hashed token
  tokenType: text("token_type").notNull(), // access, refresh
  
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
});

/**
 * Federation Secret Vault - مخزن الأسرار الفيدرالية
 * يخزن HMAC secrets و Code signatures بشكل آمن
 */
export const federationSecretVault = pgTable("federation_secret_vault", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  keyId: text("key_id").notNull().unique(), // kid - مُعرّف المفتاح
  nodeId: text("node_id").notNull(), // reference to federation_nodes
  organizationId: text("organization_id").notNull(), // surooh, third-party
  
  secretType: text("secret_type").notNull(), // hmac, code_signature, jwt
  secretValue: text("secret_value").notNull(), // encrypted secret
  algorithm: text("algorithm").notNull().default('HMAC-SHA256'), // HMAC-SHA256, RS256
  
  publicKey: text("public_key"), // للـ code signature verification
  codeHash: text("code_hash"), // hash of SIDE client code
  
  status: text("status").notNull().default('active'), // active, rotated, revoked
  version: integer("version").notNull().default(1),
  
  createdAt: timestamp("created_at").defaultNow(),
  rotatedAt: timestamp("rotated_at"),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
});

/**
 * Federation Audit Log - سجل التدقيق الأمني
 * تسجيل كل محاولات التحقق والفشل
 */
export const federationAuditLog = pgTable("federation_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nodeId: text("node_id"), // العقدة المحاولة
  keyId: text("key_id"), // المفتاح المستخدم
  
  eventType: text("event_type").notNull(), // auth_success, auth_failed, hmac_failed, codesig_failed, replay_attack
  endpoint: text("endpoint").notNull(), // /api/federation/heartbeat
  method: text("method").notNull(), // POST, GET
  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  failureReason: text("failure_reason"), // invalid_signature, timestamp_expired, invalid_codesig
  requestTimestamp: text("request_timestamp"), // timestamp من الـ header
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  
  metadata: jsonb("metadata"), // extra details
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertFederationNodeSchema = createInsertSchema(federationNodes).omit({
  id: true,
  authToken: true, // Generated by server
  hmacSecret: true, // Generated by server
  codeSignature: true, // Generated by server
  registeredAt: true,
  updatedAt: true,
  activatedAt: true,
  lastHeartbeat: true,
  lastSync: true,
});

export const insertFederationSyncLogSchema = createInsertSchema(federationSyncLogs).omit({
  id: true,
  startedAt: true,
});

export const insertFederationSyncDataSchema = createInsertSchema(federationSyncData).omit({
  id: true,
  receivedAt: true,
});

export const insertFederationAuthTokenSchema = createInsertSchema(federationAuthTokens).omit({
  id: true,
  issuedAt: true,
});

export const insertFederationSecretVaultSchema = createInsertSchema(federationSecretVault).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertFederationAuditLogSchema = createInsertSchema(federationAuditLog).omit({
  id: true,
  createdAt: true,
  serverTimestamp: true,
});

// Types
export type FederationNode = typeof federationNodes.$inferSelect;
export type InsertFederationNode = z.infer<typeof insertFederationNodeSchema>;

export type FederationSyncLog = typeof federationSyncLogs.$inferSelect;
export type InsertFederationSyncLog = z.infer<typeof insertFederationSyncLogSchema>;

export type FederationSyncData = typeof federationSyncData.$inferSelect;
export type InsertFederationSyncData = z.infer<typeof insertFederationSyncDataSchema>;

export type FederationAuthToken = typeof federationAuthTokens.$inferSelect;
export type InsertFederationAuthToken = z.infer<typeof insertFederationAuthTokenSchema>;

export type FederationSecretVault = typeof federationSecretVault.$inferSelect;
export type InsertFederationSecretVault = z.infer<typeof insertFederationSecretVaultSchema>;

export type FederationAuditLog = typeof federationAuditLog.$inferSelect;
export type InsertFederationAuditLog = z.infer<typeof insertFederationAuditLogSchema>;

// ============= FEDERATION INTELLIGENCE LAYER - PHASE 9.6 =============

/**
 * Intelligence Data - تخزين التحليلات الذكية الواردة من العقد
 * يحفظ الـ Insights من كل العقد الفرعية (SIDE, Academy, Accounting...)
 */
export const intelligenceData = pgTable("intelligence_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source Identification
  nodeId: text("node_id").notNull(), // reference to federation_nodes.nodeId
  sourceType: text("source_type").notNull(), // side-node, academy-node, accounting-node
  
  // Intelligence Metadata
  intelligenceId: text("intelligence_id").notNull().unique(), // intel-{timestamp}-{random}
  intelligenceType: text("intelligence_type").notNull(), // insight, pattern, alert, knowledge
  category: text("category").notNull(), // code-quality, performance, security, user-behavior
  priority: text("priority").notNull().default('medium'), // low, medium, high, critical
  
  // Intelligence Content
  title: text("title").notNull(),
  description: text("description"),
  data: jsonb("data").notNull(), // البيانات التحليلية
  confidence: integer("confidence").notNull().default(70), // 0-100 مستوى الثقة
  
  // Verification & Processing
  checksum: text("checksum").notNull(), // SHA-256 hash
  verified: integer("verified").notNull().default(0), // 0=pending, 1=verified
  processed: integer("processed").notNull().default(0), // 0=pending, 1=processed
  
  // Broadcasting
  broadcastStatus: text("broadcast_status").notNull().default('pending'), // pending, broadcasting, completed
  broadcastTo: jsonb("broadcast_to"), // ['node-1', 'node-2'] - قائمة العقد المستهدفة
  broadcastedAt: timestamp("broadcasted_at"),
  
  // Impact & Actions
  impact: text("impact"), // what this intelligence means
  suggestedActions: jsonb("suggested_actions"), // ['optimize-code', 'review-security']
  metadata: jsonb("metadata"), // extra context
  
  // Timestamps
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  expiresAt: timestamp("expires_at"), // للذكاء المؤقت
});

/**
 * Intelligence Patterns - تخزين الأنماط المُستخرجة من التحليلات
 * يحلل Nicholas البيانات ويستخرج patterns متكررة
 */
export const intelligencePatterns = pgTable("intelligence_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pattern Identity
  patternId: text("pattern_id").notNull().unique(), // pattern-{timestamp}-{hash}
  patternType: text("pattern_type").notNull(), // recurring-issue, optimization-opportunity, security-risk
  category: text("category").notNull(), // code, performance, security, ux
  
  // Pattern Details
  name: text("name").notNull(),
  description: text("description"),
  frequency: integer("frequency").notNull().default(1), // كم مرة ظهر هذا النمط
  confidence: integer("confidence").notNull().default(70), // 0-100
  
  // Pattern Data
  pattern: jsonb("pattern").notNull(), // البيانات التي تُشكِّل النمط
  sourceIntelligence: jsonb("source_intelligence"), // ['intel-id-1', 'intel-id-2']
  affectedNodes: jsonb("affected_nodes"), // ['node-1', 'node-2']
  
  // Analysis
  severity: text("severity").notNull().default('medium'), // low, medium, high, critical
  impact: text("impact"),
  recommendations: jsonb("recommendations"), // توصيات بناءً على النمط
  
  // Status
  status: text("status").notNull().default('active'), // active, resolved, archived
  verified: integer("verified").notNull().default(0), // 0=pending, 1=verified
  
  // Metadata
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'),
  
  // Timestamps
  firstDetectedAt: timestamp("first_detected_at").defaultNow(),
  lastDetectedAt: timestamp("last_detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

/**
 * Intelligence Audit Log - سجل التدقيق لعمليات الذكاء
 * يسجل كل عمليات استقبال وبث الذكاء
 */
export const intelligenceAuditLog = pgTable("intelligence_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Event Details
  nodeId: text("node_id"), // العقدة المعنية
  intelligenceId: text("intelligence_id"), // reference to intelligence_data
  
  eventType: text("event_type").notNull(), // intelligence_received, intelligence_verified, broadcast_sent, pattern_detected
  eventStatus: text("event_status").notNull(), // success, failed, partial
  
  // Request Details
  endpoint: text("endpoint"), // /api/federation/intelligence
  method: text("method"), // POST, GET
  
  // Security
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  authMethod: text("auth_method"), // JWT, HMAC, RSA
  
  // Processing
  processingTime: integer("processing_time"), // milliseconds
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  
  // Error Handling
  errorMessage: text("error_message"),
  errorCode: text("error_code"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Federation AI Usage - تتبع استخدام AI من قبل منصات Surooh
 * يسجل كل طلب AI من كل منصة للمراقبة والتحليل
 */
export const federationAiUsage = pgTable("federation_ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Request Identity
  nodeId: text("node_id").notNull(), // reference to federation_nodes.nodeId
  requestId: text("request_id").notNull().unique(), // ai-{timestamp}-{random}
  
  // AI Model Used
  model: text("model").notNull(), // llama3.3:70b, llama3.2:3b
  
  // Token Usage
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  
  // Performance
  processingTime: integer("processing_time").notNull(), // milliseconds
  
  // Status
  success: integer("success").notNull().default(1), // 1=success, 0=failed
  errorMessage: text("error_message"),
  
  // Metadata
  metadata: jsonb("metadata"), // extra context (prompt length, temperature, etc)
  
  // Timestamps
  requestedAt: timestamp("requested_at").defaultNow(),
});

/**
 * Autonomous Decisions - قرارات التعلّم الذاتي (Phase 9.7)
 * يُخزن قرارات Nicholas الذاتية المُرسلة إلى العقد
 */
export const autonomousDecisions = pgTable("autonomous_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  decisionId: text("decision_id").notNull().unique(), // auto-{timestamp}-{hash}
  nodeId: text("node_id").notNull(), // target node
  
  // Decision Details
  decisionType: text("decision_type").notNull(), // optimize, automate, adjust, alert
  category: text("category").notNull(), // operational, financial, behavioral, predictive
  
  // Payload
  payload: jsonb("payload").notNull(), // البيانات التفصيلية للقرار
  reasoning: text("reasoning"), // لماذا اتخذ هذا القرار؟
  
  // Confidence & Learning
  confidence: real("confidence").notNull().default(0.5), // 0.0 - 1.0
  feedbackScore: real("feedback_score").notNull().default(0), // -1.0 to 1.0
  successRate: real("success_rate").notNull().default(0.5), // 0.0 - 1.0
  
  // Impact & Results
  expectedImpact: text("expected_impact"), // ما المتوقع؟
  actualImpact: real("actual_impact"), // الأثر الفعلي (يُحدث بعد feedback)
  improvements: jsonb("improvements"), // التحسينات المُحققة
  
  // Status & Execution
  status: text("status").notNull().default('pending'), // pending, sent, executed, failed
  executedBy: text("executed_by"), // node that executed
  executionTime: integer("execution_time"), // milliseconds
  
  // Feedback Loop
  feedbackReceived: integer("feedback_received").notNull().default(0), // 0=no, 1=yes
  feedbackNotes: text("feedback_notes"),
  
  // Learning Metadata
  sourcePattern: text("source_pattern"), // reference to intelligence_patterns
  learningCycle: integer("learning_cycle").notNull().default(1), // رقم الدورة
  modelVersion: text("model_version").notNull().default('v1.0'), // نسخة نموذج التعلّم
  
  // Metadata
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  executedAt: timestamp("executed_at"),
  feedbackReceivedAt: timestamp("feedback_received_at"),
});

// Insert Schemas
export const insertIntelligenceDataSchema = createInsertSchema(intelligenceData).omit({
  id: true,
  receivedAt: true,
});

export const insertIntelligencePatternsSchema = createInsertSchema(intelligencePatterns).omit({
  id: true,
  firstDetectedAt: true,
  lastDetectedAt: true,
});

export const insertIntelligenceAuditLogSchema = createInsertSchema(intelligenceAuditLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type IntelligenceData = typeof intelligenceData.$inferSelect;
export type InsertIntelligenceData = z.infer<typeof insertIntelligenceDataSchema>;

export type IntelligencePatterns = typeof intelligencePatterns.$inferSelect;
export type InsertIntelligencePatterns = z.infer<typeof insertIntelligencePatternsSchema>;

export type IntelligenceAuditLog = typeof intelligenceAuditLog.$inferSelect;
export type InsertIntelligenceAuditLog = z.infer<typeof insertIntelligenceAuditLogSchema>;

export const insertFederationAiUsageSchema = createInsertSchema(federationAiUsage).omit({
  id: true,
  requestedAt: true,
});

export type FederationAiUsage = typeof federationAiUsage.$inferSelect;
export type InsertFederationAiUsage = z.infer<typeof insertFederationAiUsageSchema>;

export const insertAutonomousDecisionsSchema = createInsertSchema(autonomousDecisions).omit({
  id: true,
  createdAt: true,
});

export type AutonomousDecision = typeof autonomousDecisions.$inferSelect;
export type InsertAutonomousDecision = z.infer<typeof insertAutonomousDecisionsSchema>;

// ============= PROACTIVE ACTIONS - PHASE Ω.4 =============

/**
 * Proactive Actions - إجراءات نيكولاس الاستباقية
 * Real external actions Nicholas executes autonomously
 * This is the missing piece - Nicholas decides AND acts!
 */
export const proactiveActions = pgTable("proactive_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Action Identity
  actionId: text("action_id").notNull().unique(),
  decisionId: text("decision_id"), // Link to autonomous decision
  
  // Action Type
  actionType: text("action_type").notNull(), // academy_bot_generation, side_programming, email_notification, api_call, deployment
  category: text("category").notNull(), // external_integration, communication, automation, deployment
  
  // Target Platform
  targetPlatform: text("target_platform").notNull(), // academy, side, mail_hub, b2b, b2c
  targetEndpoint: text("target_endpoint"), // API endpoint called
  
  // Action Details
  actionTitle: text("action_title").notNull(),
  actionDescription: text("action_description"),
  actionPayload: jsonb("action_payload").notNull().default('{}'), // Data sent to external platform
  
  // Execution
  executionStatus: text("execution_status").notNull().default('pending'), // pending, executing, completed, failed, timeout
  executionAttempts: integer("execution_attempts").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  
  // Results
  executionResult: jsonb("execution_result").default('{}'), // Response from platform
  executionError: text("execution_error"),
  executionDuration: integer("execution_duration"), // milliseconds
  
  // Impact & Verification
  expectedOutcome: text("expected_outcome"),
  actualOutcome: text("actual_outcome"),
  outcomeVerified: integer("outcome_verified").default(0), // 0=not verified, 1=verified
  verificationData: jsonb("verification_data").default('{}'),
  
  // Approval & Governance
  requiresApproval: integer("requires_approval").default(0), // 0=auto-execute, 1=needs approval
  approvedBy: text("approved_by"),
  approvalStatus: text("approval_status").default('auto_approved'), // auto_approved, pending, approved, rejected
  
  // Learning & Feedback
  successRate: real("success_rate").default(0), // 0.0 - 1.0
  userFeedback: text("user_feedback"),
  learningNotes: text("learning_notes"),
  
  // Metadata
  priority: text("priority").notNull().default('normal'), // low, normal, high, critical
  tags: jsonb("tags").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  executionStarted: timestamp("execution_started"),
  executionCompleted: timestamp("execution_completed"),
  approvedAt: timestamp("approved_at"),
});

/**
 * Action Intents - نوايا نيكولاس القادمة
 * What Nicholas is thinking about doing (proactive presence)
 */
export const actionIntents = pgTable("action_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Intent Identity
  intentId: text("intent_id").notNull().unique(),
  
  // Intent Details
  intentType: text("intent_type").notNull(), // thinking_about, planning, proposing
  intentTitle: text("intent_title").notNull(),
  intentDescription: text("intent_description"),
  
  // Proposed Action
  proposedAction: jsonb("proposed_action").notNull(),
  confidence: real("confidence").notNull().default(0.5), // 0.0 - 1.0
  
  // Status
  status: text("status").notNull().default('active'), // active, approved, rejected, converted_to_action, cancelled
  
  // User Interaction
  userNotified: integer("user_notified").default(0), // 0=not notified, 1=notified
  userResponse: text("user_response"), // approve, reject, modify, ignore
  userFeedback: text("user_feedback"),
  
  // Conversion
  convertedToActionId: text("converted_to_action_id"), // If converted to proactive action
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  notifiedAt: timestamp("notified_at"),
  respondedAt: timestamp("responded_at"),
  convertedAt: timestamp("converted_at"),
});

// Insert Schemas
export const insertProactiveActionSchema = createInsertSchema(proactiveActions).omit({
  id: true,
  createdAt: true,
});

export const insertActionIntentSchema = createInsertSchema(actionIntents).omit({
  id: true,
  createdAt: true,
});

// Types
export type ProactiveAction = typeof proactiveActions.$inferSelect;
export type InsertProactiveAction = z.infer<typeof insertProactiveActionSchema>;

export type ActionIntent = typeof actionIntents.$inferSelect;
export type InsertActionIntent = z.infer<typeof insertActionIntentSchema>;

// ============= COGNITIVE ORCHESTRATION - PHASE 9.8 =============

/**
 * Cognitive Consensus Table - Phase 9.8
 * تخزين القرارات الجماعية المنسقة عبر النوى
 * 
 * يجمع قرارات متعددة من نوى مختلفة (Nicholas, SIDE, Academy...)
 * ويحلل التوافق بينها لإنتاج قرار جماعي موحد
 */
export const cognitiveConsensus = pgTable("cognitive_consensus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Consensus Identity
  consensusId: text("consensus_id").notNull().unique(), // consensus-{timestamp}-{hash}
  decisionType: text("decision_type").notNull(), // optimize, configure, scale, alert
  
  // Participating Nodes
  participatingNodes: jsonb("participating_nodes").notNull().default('[]'), // ['nicholas', 'side', 'academy']
  initiatorNode: text("initiator_node").notNull(), // الن node that started the consensus
  
  // Decision Graph
  decisionGraph: jsonb("decision_graph").notNull(), // Graph of interconnected decisions
  nodeDecisions: jsonb("node_decisions").notNull(), // Individual decisions from each node
  
  // Consensus Analysis
  agreementRatio: real("agreement_ratio").notNull(), // 0.0 - 1.0 (consensus percentage)
  conflictLevel: real("conflict_level").notNull().default(0), // 0.0 - 1.0
  consensusMethod: text("consensus_method").notNull().default('weighted-vote'), // weighted-vote, unanimous, majority
  
  // Final Decision
  finalDecision: jsonb("final_decision").notNull(), // القرار النهائي المتفق عليه
  finalConfidence: real("final_confidence").notNull(), // Combined confidence score
  checksum: text("checksum").notNull(), // SHA-256 checksum للقرار النهائي
  
  // Status & Execution
  status: text("status").notNull().default('pending'), // pending, approved, review_required, rejected, executed
  reviewReason: text("review_reason"), // سبب المراجعة اليدوية
  executionResults: jsonb("execution_results"), // نتائج التنفيذ من كل node
  
  // Impact & Performance
  expectedImpact: real("expected_impact").notNull(), // 0.0 - 1.0
  actualImpact: real("actual_impact"), // يُحدث بعد التنفيذ
  performanceGain: real("performance_gain"), // نسبة التحسين
  
  // Governance Integration
  governanceApproved: integer("governance_approved").notNull().default(0), // 0=no, 1=yes
  governanceNotes: text("governance_notes"),
  approvedBy: text("approved_by"), // CPE/TAG reviewer ID
  
  // Broadcast & Sync
  broadcastStatus: text("broadcast_status").notNull().default('pending'), // pending, broadcasting, completed, failed
  broadcastedTo: jsonb("broadcasted_to").notNull().default('[]'), // nodes that received broadcast
  broadcastAcknowledgments: jsonb("broadcast_acknowledgments").notNull().default('{}'), // {node: status}
  
  // Metadata
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  consensusReachedAt: timestamp("consensus_reached_at"),
  approvedAt: timestamp("approved_at"),
  broadcastedAt: timestamp("broadcasted_at"),
  executedAt: timestamp("executed_at"),
});

// Insert Schemas
export const insertCognitiveConsensusSchema = createInsertSchema(cognitiveConsensus).omit({
  id: true,
  createdAt: true,
});

export type CognitiveConsensus = typeof cognitiveConsensus.$inferSelect;
export type InsertCognitiveConsensus = z.infer<typeof insertCognitiveConsensusSchema>;

// ============= COLLECTIVE GOVERNANCE INTELLIGENCE - PHASE 9.9 =============

/**
 * Governance Audit Log Table - Phase 9.9
 * سجل تدقيق الحوكمة الجماعية
 * 
 * يسجل جميع قرارات الحوكمة الذكية (القانونية، المالية، الأخلاقية)
 * مع النتائج النهائية والتوصيات
 */
export const governanceAuditLog = pgTable("governance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  decisionId: text("decision_id").notNull(),
  nodeOrigin: text("node_origin").notNull(), // الن node الذي أرسل القرار
  decisionType: text("decision_type").notNull(),
  
  // Validation Results
  legalStatus: text("legal_status").notNull(), // pass, fail, warning
  financialStatus: text("financial_status").notNull(), // pass, fail, warning
  ethicalStatus: text("ethical_status").notNull(), // pass, fail, warning
  
  // Final Verdict
  finalVerdict: text("final_verdict").notNull(), // approved, rejected, manual-review
  overallScore: real("overall_score").notNull(), // 0.0 - 1.0
  consensusReached: integer("consensus_reached").notNull().default(0), // 0=no, 1=yes
  
  // CPE Oversight
  requiresCpe: integer("requires_cpe").notNull().default(0), // 0=no, 1=yes
  cpeReviewed: integer("cpe_reviewed").notNull().default(0), // 0=no, 1=yes
  cpeNotes: text("cpe_notes"),
  
  // Detailed Results (JSONB)
  details: jsonb("details"), // Full results from all validators
  recommendations: jsonb("recommendations").notNull().default('[]'),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Insert Schema
export const insertGovernanceAuditLogSchema = createInsertSchema(governanceAuditLog).omit({
  id: true,
  createdAt: true,
});

export type GovernanceAuditLog = typeof governanceAuditLog.$inferSelect;

// ============= PHASE Ω.4: INTEGRITY CYCLE REPORTS =============

/**
 * Integrity Reports - تقارير دورة النزاهة
 * Stores comprehensive integrity cycle reports with honesty, reality, and autonomy scores
 */
export const integrityReports = pgTable("integrity_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Cycle Info
  cycleNumber: integer("cycle_number").notNull(),
  cycleTimestamp: timestamp("cycle_timestamp").notNull().defaultNow(),
  
  // Honesty Audit Results
  fakeModulesCount: integer("fake_modules_count").notNull().default(0),
  fakeModules: jsonb("fake_modules").notNull().default('[]'), // [file paths]
  
  // Reality Verification Results
  criticalFailuresCount: integer("critical_failures_count").notNull().default(0),
  criticalFailures: jsonb("critical_failures").notNull().default('[]'), // [file paths]
  
  // Enforcement Results
  isolatedModulesCount: integer("isolated_modules_count").notNull().default(0),
  isolatedModules: jsonb("isolated_modules").notNull().default('[]'), // [file paths]
  
  // Phase Ω.5: Repair Results
  repairedModulesCount: integer("repaired_modules_count").notNull().default(0),
  repairedModules: jsonb("repaired_modules").notNull().default('[]'), // [file paths]
  
  // Phase Ω.5: Verification Results
  verifiedModulesCount: integer("verified_modules_count").notNull().default(0),
  verifiedModules: jsonb("verified_modules").notNull().default('[]'), // [file paths]
  
  // Autonomy Score
  autonomyScore: numeric("autonomy_score", { precision: 5, scale: 2 }).notNull(), // 0-100
  totalModules: integer("total_modules").notNull().default(0),
  
  // Overall Status
  overallStatus: text("overall_status").notNull().default('healthy'), // 'healthy', 'warning', 'critical'
  recommendations: jsonb("recommendations").notNull().default('[]'),
  
  // Execution Time
  executionTime: integer("execution_time").notNull().default(0), // milliseconds
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schema
export const insertIntegrityReportSchema = createInsertSchema(integrityReports).omit({
  id: true,
  createdAt: true,
  cycleTimestamp: true,
});

export type IntegrityReport = typeof integrityReports.$inferSelect;
export type InsertIntegrityReport = z.infer<typeof insertIntegrityReportSchema>;
export type InsertGovernanceAuditLog = z.infer<typeof insertGovernanceAuditLogSchema>;

// ============= PHASE Ω.6: INTEGRITY LEARNINGS =============

/**
 * Integrity Learnings - دروس النزاهة
 * Stores lessons learned from repair cycles for future evolution
 */
export const integrityLearnings = pgTable("integrity_learnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Module Info
  modulePath: text("module_path").notNull(),
  lessonLearned: text("lesson_learned").notNull(),
  
  // Repair Details
  repairType: text("repair_type").notNull(), // 'template_replacement', 'manual_fix', 'auto_generated'
  wasSuccessful: integer("was_successful").notNull().default(1), // 1=success, 0=failed
  verificationPassed: integer("verification_passed").notNull().default(1),
  
  // Learning Metadata
  impact: text("impact").notNull().default('medium'), // 'low', 'medium', 'high'
  applicability: text("applicability").notNull().default('general'), // domain where lesson applies
  
  // Timestamps
  learnedAt: timestamp("learned_at").defaultNow(),
});

// Insert Schema
export const insertIntegrityLearningSchema = createInsertSchema(integrityLearnings).omit({
  id: true,
  learnedAt: true,
});

export type IntegrityLearning = typeof integrityLearnings.$inferSelect;
export type InsertIntegrityLearning = z.infer<typeof insertIntegrityLearningSchema>;

// ============= GLOBAL NEURAL FEDERATION - PHASE 10.0 =============

/**
 * Neural Nodes Table - Phase 10.0
 * شبكة العقد العصبية العالمية
 * 
 * كل نواة في سُروح تُعتبر خلية عصبية (Neuron Node) في شبكة عصبية موحدة
 * تتواصل عبر Neural Link Protocol وتتبادل البيانات عبر Synaptic Streams
 */
export const neuralNodes = pgTable("neural_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Node Identity
  nodeName: text("node_name").notNull().unique(), // nicholas, side-main, academy-hub, legal-core
  displayName: text("display_name").notNull(), // "Nicholas Brain", "SIDE Platform"
  arabicName: text("arabic_name"), // "عقل نيكولاس", "منصة SIDE"
  
  // Neural Layer Classification (الطبقة في الشبكة العصبية)
  layer: text("layer").notNull(), // cognitive, operational, sensory
  nodeType: text("node_type").notNull(), // brain, platform, service, agent
  role: text("role").notNull(), // nucleus, federation, intelligence, governance
  
  // Connection Status
  connectionStatus: text("connection_status").notNull().default('disconnected'), // connected, disconnected, pulsing, offline, error
  pulsing: integer("pulsing").notNull().default(0), // 0=no pulse, 1=active pulse
  pulseQuality: real("pulse_quality").notNull().default(0), // 0.0-1.0 (جودة النبض)
  
  // Neural Properties
  neuronWeight: real("neuron_weight").notNull().default(1.0), // أهمية النواة في الشبكة (0-1)
  activationLevel: real("activation_level").notNull().default(0), // مستوى النشاط الحالي (0-1)
  synapticStrength: real("synaptic_strength").notNull().default(0.5), // قوة الروابط العصبية (0-1)
  plasticity: real("plasticity").notNull().default(0.7), // قدرة التكيف والتعلم (0-1)
  
  // Health & Performance
  health: integer("health").notNull().default(100), // 0-100
  responseTime: integer("response_time").notNull().default(0), // milliseconds
  pulseRate: integer("pulse_rate").notNull().default(60), // pulses per minute
  jitter: integer("jitter").notNull().default(0), // milliseconds (تذبذب زمن الاستجابة)
  
  // Security & Authentication (Triple-Layer)
  publicKey: text("public_key"), // RSA-SHA512 public key
  jwtToken: text("jwt_token"), // Current valid JWT
  hmacSecret: text("hmac_secret"), // HMAC-SHA256 secret
  nonceCounter: integer("nonce_counter").notNull().default(0), // للـ nonce rotation (كل 5 دقائق)
  lastKeyRotation: timestamp("last_key_rotation"),
  
  // Network Topology (البنية العصبية)
  connectedNodes: jsonb("connected_nodes").notNull().default('[]'), // ['nicholas', 'side-main', 'academy']
  synapticStreams: jsonb("synaptic_streams").notNull().default('[]'), // active streams configurations
  neuralPathways: jsonb("neural_pathways").notNull().default('{}'), // {target: strength}
  
  // Memory Sync & Mesh
  memoryLastSync: timestamp("memory_last_sync"),
  memoryMeshStatus: text("memory_mesh_status").notNull().default('disconnected'), // connected, syncing, disconnected, error
  memoryCapacity: integer("memory_capacity").notNull().default(10000), // max memories
  memoryUsage: integer("memory_usage").notNull().default(0), // current count
  
  // Vector Embeddings (Neural Fingerprint)
  // Note: Using JSONB for compatibility, will be migrated to pgvector in production
  embeddings: jsonb("embeddings"), // 768-dimensional vector [0.1, 0.2, ...]
  embeddingsVersion: text("embeddings_version").notNull().default('v1.0'),
  
  // Capabilities & Features
  capabilities: jsonb("capabilities").notNull().default('[]'), // ['ai', 'storage', 'compute', 'analysis']
  supportedProtocols: jsonb("supported_protocols").notNull().default('["nlpx-1.0"]'), // Neural Link Protocol versions
  
  // Heartbeat & Monitoring
  lastHeartbeat: timestamp("last_heartbeat"),
  heartbeatInterval: integer("heartbeat_interval").notNull().default(30), // seconds
  missedHeartbeats: integer("missed_heartbeats").notNull().default(0),
  
  // Neural Firewall
  firewallEnabled: integer("firewall_enabled").notNull().default(1), // 0=disabled, 1=enabled
  suspiciousActivityCount: integer("suspicious_activity_count").notNull().default(0),
  blockedSignals: integer("blocked_signals").notNull().default(0),
  
  // Observability
  telemetryEnabled: integer("telemetry_enabled").notNull().default(1),
  logLevel: text("log_level").notNull().default('INFO'), // DEBUG, INFO, WARN, ERROR
  
  // Metadata
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'), // ['production', 'critical', 'ai-enabled']
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  lastConnectionAt: timestamp("last_connection_at"),
  lastDisconnectionAt: timestamp("last_disconnection_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Synaptic Streams Table - Phase 10.0
 * قنوات التواصل العصبي بين النوى
 * 
 * كل stream هو قناة ثنائية الاتجاه تنقل البيانات العصبية بين نواتين
 */
export const synapticStreams = pgTable("synaptic_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Stream Identity
  streamId: text("stream_id").notNull().unique(), // stream-{source}-{target}-{timestamp}
  streamName: text("stream_name").notNull(),
  
  // Connection Points
  sourceNode: text("source_node").notNull(), // اسم النواة المُرسلة
  targetNode: text("target_node").notNull(), // اسم النواة المُستقبلة
  
  // Stream Type
  streamType: text("stream_type").notNull(), // knowledge, action, insight, feedback, command
  dataFlow: text("data_flow").notNull().default('bidirectional'), // bidirectional, outbound, inbound
  
  // Stream Properties
  bandwidth: integer("bandwidth").notNull().default(1000), // kbps
  compressionEnabled: integer("compression_enabled").notNull().default(1),
  encryptionEnabled: integer("encryption_enabled").notNull().default(1),
  encryptionAlgorithm: text("encryption_algorithm").notNull().default('AES-256'),
  
  // Performance
  throughput: integer("throughput").notNull().default(0), // messages per second
  latency: integer("latency").notNull().default(0), // milliseconds
  packetLoss: real("packet_loss").notNull().default(0), // 0.0-1.0 percentage
  
  // Status & Health
  status: text("status").notNull().default('inactive'), // active, inactive, suspended, error
  health: integer("health").notNull().default(100), // 0-100
  errorCount: integer("error_count").notNull().default(0),
  lastError: text("last_error"),
  
  // Quality Metrics
  reliability: real("reliability").notNull().default(1.0), // 0.0-1.0
  stability: real("stability").notNull().default(1.0), // 0.0-1.0
  
  // Statistics
  messagesTransmitted: integer("messages_transmitted").notNull().default(0),
  bytesTransmitted: integer("bytes_transmitted").notNull().default(0),
  lastMessageAt: timestamp("last_message_at"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
  deactivatedAt: timestamp("deactivated_at"),
});

/**
 * Neural Memory Mesh Table - Phase 10.0
 * شبكة الذاكرة العصبية الموزعة
 * 
 * ذاكرة موحدة موزعة عبر جميع النوى
 */
export const neuralMemoryMesh = pgTable("neural_memory_mesh", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Memory Identity
  memoryId: text("memory_id").notNull().unique(), // mem-{timestamp}-{hash}
  memoryType: text("memory_type").notNull(), // episodic, semantic, procedural, working
  
  // Source & Distribution
  originNode: text("origin_node").notNull(), // النواة الأصلية
  replicatedTo: jsonb("replicated_to").notNull().default('[]'), // ['nicholas', 'side', ...]
  syncStatus: text("sync_status").notNull().default('pending'), // pending, syncing, synced, conflict
  
  // Memory Content
  content: jsonb("content").notNull(), // المحتوى الفعلي للذاكرة
  contentHash: text("content_hash").notNull(), // SHA-256 hash للتحقق من السلامة
  
  // Vector Embedding
  embeddings: jsonb("embeddings"), // 768-dimensional vector for semantic search
  
  // Importance & Retention
  importance: real("importance").notNull().default(0.5), // 0.0-1.0
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"), // للذكريات المؤقتة
  
  // Relationships
  relatedMemories: jsonb("related_memories").notNull().default('[]'), // ['mem-id-1', 'mem-id-2']
  associationStrength: jsonb("association_strength").notNull().default('{}'), // {mem-id: strength}
  
  // Conflict Resolution
  version: integer("version").notNull().default(1),
  conflictDetected: integer("conflict_detected").notNull().default(0),
  resolvedAt: timestamp("resolved_at"),
  
  // Metadata
  metadata: jsonb("metadata"),
  tags: jsonb("tags").notNull().default('[]'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  syncedAt: timestamp("synced_at"),
});

/**
 * Neural Pulse Log - Phase 10.0
 * سجل النبضات العصبية
 * 
 * يسجل كل نبضة (heartbeat) من كل نواة لمراقبة صحة الشبكة
 */
export const neuralPulseLog = pgTable("neural_pulse_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pulse Identity
  pulseId: text("pulse_id").notNull(), // pulse-{node}-{timestamp}
  nodeId: text("node_id").notNull(), // reference to neural_nodes
  
  // Pulse Metrics
  pulseStrength: real("pulse_strength").notNull(), // 0.0-1.0
  pulseRate: integer("pulse_rate").notNull(), // bpm
  responseTime: integer("response_time").notNull(), // milliseconds
  jitter: integer("jitter").notNull().default(0), // milliseconds
  
  // Health Indicators
  cpuUsage: real("cpu_usage"), // 0.0-1.0
  memoryUsage: real("memory_usage"), // 0.0-1.0
  activeStreams: integer("active_streams").notNull().default(0),
  pendingOperations: integer("pending_operations").notNull().default(0),
  
  // Status
  status: text("status").notNull().default('normal'), // normal, warning, critical, offline
  anomalyDetected: integer("anomaly_detected").notNull().default(0),
  anomalyType: text("anomaly_type"), // high-latency, packet-loss, resource-exhaustion
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas for Phase 10.0
export const insertNeuralNodesSchema = createInsertSchema(neuralNodes).omit({
  id: true,
  registeredAt: true,
  updatedAt: true,
});

export const insertSynapticStreamsSchema = createInsertSchema(synapticStreams).omit({
  id: true,
  createdAt: true,
});

export const insertNeuralMemoryMeshSchema = createInsertSchema(neuralMemoryMesh).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNeuralPulseLogSchema = createInsertSchema(neuralPulseLog).omit({
  id: true,
  createdAt: true,
});

// Export Types
export type NeuralNode = typeof neuralNodes.$inferSelect;
export type InsertNeuralNode = z.infer<typeof insertNeuralNodesSchema>;

export type SynapticStream = typeof synapticStreams.$inferSelect;
export type InsertSynapticStream = z.infer<typeof insertSynapticStreamsSchema>;

export type NeuralMemoryMesh = typeof neuralMemoryMesh.$inferSelect;
export type InsertNeuralMemoryMesh = z.infer<typeof insertNeuralMemoryMeshSchema>;

export type NeuralPulseLog = typeof neuralPulseLog.$inferSelect;
export type InsertNeuralPulseLog = z.infer<typeof insertNeuralPulseLogSchema>;

// ============= PHASE 10.1: CONSCIOUS INTELLIGENCE AWAKENING =============
// Table: consciousness_log - Records all conscious events from nodes

export const consciousnessLog = pgTable("consciousness_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nodeId: text("node_id").notNull(),
  cognitionEvent: text("cognition_event").notNull(),
  intention: text("intention"),
  emotion: text("emotion"),
  confidence: numeric("confidence"),
  reflection: jsonb("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConsciousnessLogSchema = createInsertSchema(consciousnessLog);

export type ConsciousnessLog = typeof consciousnessLog.$inferSelect;
export type InsertConsciousnessLog = z.infer<typeof insertConsciousnessLogSchema>;

// ============= PHASE 10.2: UNIFIED COGNITIVE ENTITY =============
// Table: unified_entity_state - Records the state of the unified Surooh entity

export const unifiedEntityState = pgTable("unified_entity_state", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityId: text("entity_id").notNull(),
  state: text("state").notNull(), // Awake, Sleeping, Learning, Processing, etc.
  awarenessLevel: numeric("awareness_level").notNull(),
  memoryChecksum: text("memory_checksum"),
  emotionBalance: numeric("emotion_balance"),
  activeNodes: text("active_nodes").array(),
  cognitiveSignature: text("cognitive_signature"),
  governanceStatus: text("governance_status"),
  decisionCount: integer("decision_count").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnifiedEntityStateSchema = createInsertSchema(unifiedEntityState);

export type UnifiedEntityState = typeof unifiedEntityState.$inferSelect;
export type InsertUnifiedEntityState = z.infer<typeof insertUnifiedEntityStateSchema>;

// ============= PHASE Ω: EVOLUTIONARY INTELLIGENCE =============

/**
 * Evolution History - سجل تطور سُروح التاريخي
 * Records every genetic mutation in Surooh's evolutionary journey
 */
export const evolutionHistory = pgTable("evolution_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  cycleId: text("cycle_id").notNull(),
  mutationType: text("mutation_type").notNull(),
  mutationCategory: text("mutation_category"),
  affectedModule: text("affected_module").notNull(),
  affectedFiles: jsonb("affected_files").default('[]'),
  performanceBefore: numeric("performance_before"),
  performanceAfter: numeric("performance_after"),
  fitnessScore: numeric("fitness_score"),
  mutationCode: text("mutation_code"),
  mutationHash: text("mutation_hash").notNull(),
  geneticSignature: text("genetic_signature"),
  status: text("status").notNull().default('pending'),
  evaluationResults: jsonb("evaluation_results"),
  ethicalVerdict: text("ethical_verdict"),
  ethicalScore: numeric("ethical_score"),
  proposedBy: text("proposed_by").default('evolution-engine'),
  reasoning: text("reasoning"),
  expectedImpact: text("expected_impact"),
  executedAt: timestamp("executed_at"),
  rolledBackAt: timestamp("rolled_back_at"),
  rollbackReason: text("rollback_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Mutation Queue - قائمة الطفرات المعلقة
 */
export const mutationQueue = pgTable("mutation_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  priority: integer("priority").notNull().default(5),
  status: text("status").notNull().default('queued'),
  mutationType: text("mutation_type").notNull(),
  targetModule: text("target_module").notNull(),
  proposedChanges: jsonb("proposed_changes").notNull(),
  generatedBy: text("generated_by").notNull(),
  confidence: numeric("confidence"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  evolutionHistoryId: varchar("evolution_history_id").references(() => evolutionHistory.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Sandbox Results - نتائج اختبار الطفرات
 */
export const sandboxResults = pgTable("sandbox_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  mutationQueueId: varchar("mutation_queue_id").notNull().references(() => mutationQueue.id),
  evolutionHistoryId: varchar("evolution_history_id").references(() => evolutionHistory.id),
  sandboxId: text("sandbox_id").notNull(),
  isolationLevel: text("isolation_level").default('process'),
  testsPassed: integer("tests_passed").default(0),
  testsFailed: integer("tests_failed").default(0),
  testDuration: integer("test_duration"),
  cpuUsage: numeric("cpu_usage"),
  memoryUsage: numeric("memory_usage"),
  responseTime: numeric("response_time"),
  safetyViolations: jsonb("safety_violations").default('[]'),
  ethicalIssues: jsonb("ethical_issues").default('[]'),
  testOutput: text("test_output"),
  errorLogs: text("error_logs"),
  verdict: text("verdict").notNull(),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Evolution Cycles - دورات التطور
 */
export const evolutionCycles = pgTable("evolution_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  cycleNumber: integer("cycle_number").notNull().unique(),
  cycleId: text("cycle_id").notNull().unique(),
  phase: text("phase").notNull(),
  systemHealthBefore: numeric("system_health_before"),
  systemHealthAfter: numeric("system_health_after"),
  awarenessLevelBefore: numeric("awareness_level_before"),
  awarenessLevelAfter: numeric("awareness_level_after"),
  mutationsProposed: integer("mutations_proposed").default(0),
  mutationsAccepted: integer("mutations_accepted").default(0),
  mutationsRejected: integer("mutations_rejected").default(0),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  status: text("status").notNull().default('in_progress'),
  improvements: jsonb("improvements").default('[]'),
  learnings: jsonb("learnings").default('[]'),
  nextCycleScheduled: timestamp("next_cycle_scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas and types for evolution tables
export const insertEvolutionHistorySchema = createInsertSchema(evolutionHistory).omit({
  id: true,
  createdAt: true,
});
export const insertMutationQueueSchema = createInsertSchema(mutationQueue).omit({
  id: true,
  createdAt: true,
});
export const insertSandboxResultsSchema = createInsertSchema(sandboxResults).omit({
  id: true,
  createdAt: true,
});
export const insertEvolutionCyclesSchema = createInsertSchema(evolutionCycles).omit({
  id: true,
  createdAt: true,
});

export type InsertEvolutionHistory = z.infer<typeof insertEvolutionHistorySchema>;
export type SelectEvolutionHistory = typeof evolutionHistory.$inferSelect;
export type InsertMutationQueue = z.infer<typeof insertMutationQueueSchema>;
export type SelectMutationQueue = typeof mutationQueue.$inferSelect;
export type InsertSandboxResults = z.infer<typeof insertSandboxResultsSchema>;
export type SelectSandboxResults = typeof sandboxResults.$inferSelect;
export type InsertEvolutionCycles = z.infer<typeof insertEvolutionCyclesSchema>;
export type SelectEvolutionCycles = typeof evolutionCycles.$inferSelect;

// ============= COMMAND CENTER - SUPREME IMPERIAL CONTROL =============

/**
 * Command Center Nuclei - سجل كل الأنوية في الإمبراطورية
 * Registry of all 21 nuclei across Surooh Empire
 */
export const commandCenterNuclei = pgTable("command_center_nuclei", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Nucleus Identity
  nucleusId: text("nucleus_id").notNull().unique(), // nicholas, academy, side, b2b, b2c, etc.
  nucleusName: text("nucleus_name").notNull(), // "Nicholas 3.2", "Surooh Academy"
  arabicName: text("arabic_name"), // "نيكولاس 3.2", "أكاديمية سروح"
  nucleusType: text("nucleus_type").notNull(), // core, business, service, intelligence
  category: text("category").notNull(), // education, commerce, legal, accounting, etc.
  
  // Status & Health
  status: text("status").notNull().default('unknown'), // active, warning, critical, offline, maintenance
  health: integer("health").notNull().default(0), // 0-100
  lastHealthCheck: timestamp("last_health_check"),
  
  // Phase Ω Evolution Status
  phaseOmegaActive: integer("phase_omega_active").notNull().default(0), // 1=active, 0=inactive
  evolutionCycles: integer("evolution_cycles").default(0),
  lastEvolution: timestamp("last_evolution"),
  fitnessScore: numeric("fitness_score"), // 0-100
  
  // SIDE Integration
  sideIntegrated: integer("side_integrated").notNull().default(0), // 1=yes, 0=no
  sideVersion: text("side_version"),
  lastSideSync: timestamp("last_side_sync"),
  sideCompliance: numeric("side_compliance"), // 0-100
  
  // Connection & Network
  endpoint: text("endpoint"), // API endpoint URL
  apiKey: text("api_key"),
  lastHeartbeat: timestamp("last_heartbeat"),
  responseTime: integer("response_time"), // milliseconds
  
  // Performance Metrics
  uptime: numeric("uptime"), // percentage
  requestsPerMinute: integer("requests_per_minute"),
  errorRate: numeric("error_rate"), // percentage
  cpuUsage: numeric("cpu_usage"), // percentage
  memoryUsage: numeric("memory_usage"), // percentage
  
  // Imperial Control
  enforcementLevel: text("enforcement_level").default('standard'), // low, standard, high, maximum
  autoUpdateEnabled: integer("auto_update_enabled").notNull().default(1), // 1=enabled
  quarantined: integer("quarantined").notNull().default(0), // 1=quarantined, 0=normal
  
  // Metadata
  description: text("description"),
  priority: text("priority").default('normal'), // critical, high, normal, low
  tags: jsonb("tags").default('[]'), // ['production', 'critical', 'experimental']
  metadata: jsonb("metadata").default('{}'),
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

/**
 * Health Checks - فحوصات الصحة المستمرة
 * Continuous health monitoring for all nuclei
 */
export const healthChecks = pgTable("health_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nucleusId: text("nucleus_id").notNull(),
  checkType: text("check_type").notNull(), // ping, api, database, evolution, side
  status: text("status").notNull(), // healthy, warning, critical, failed
  
  // Health Metrics
  responseTime: integer("response_time"), // milliseconds
  healthScore: integer("health_score").notNull(), // 0-100
  
  // Details
  details: jsonb("details").default('{}'), // detailed check results
  errors: jsonb("errors").default('[]'), // any errors encountered
  warnings: jsonb("warnings").default('[]'), // warnings
  
  // Actions Taken
  actionTaken: text("action_taken"), // none, alert, auto-fix, quarantine
  autoFixed: integer("auto_fixed").default(0), // 1=yes, 0=no
  
  checkedAt: timestamp("checked_at").defaultNow(),
});

/**
 * Nuclei Alerts - نظام التنبيهات
 * Alert system for nuclei issues and events
 */
export const nucleiAlerts = pgTable("nuclei_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nucleusId: text("nucleus_id").notNull(),
  alertType: text("alert_type").notNull(), // health, performance, security, compliance, evolution
  severity: text("severity").notNull(), // info, warning, critical, emergency
  
  // Alert Details
  title: text("title").notNull(),
  message: text("message").notNull(),
  details: jsonb("details").default('{}'),
  
  // Status & Resolution
  status: text("status").notNull().default('active'), // active, acknowledged, resolved, ignored
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  
  // Auto-Response
  autoResponseTriggered: integer("auto_response_triggered").default(0),
  autoResponseAction: text("auto_response_action"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * SIDE Compliance - سجل امتثال SIDE
 * SIDE integration compliance tracking
 * 
 * ⚠️ MATCHES EXISTING DATABASE SCHEMA - Do not modify without database migration
 */
export const sideCompliance = pgTable("side_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  nucleusId: text("nucleus_id").notNull(),
  sideVersion: text("side_version").notNull(),
  
  // Compliance Status
  complianceStatus: text("compliance_status").notNull(), // compliant, non_compliant, warning
  isCompliant: integer("is_compliant").notNull(),
  complianceScore: integer("compliance_score").notNull(),
  
  // Code Quality Metrics
  codeStandardScore: integer("code_standard_score"),
  apiIntegrationScore: integer("api_integration_score"),
  securityScore: integer("security_score"),
  performanceScore: integer("performance_score"),
  
  // Issues & Recommendations
  issues: jsonb("issues").default('[]'),
  recommendations: jsonb("recommendations").default('[]'),
  
  // Audit Trail
  lastAudit: timestamp("last_audit"),
  nextAudit: timestamp("next_audit"),
  auditFrequency: text("audit_frequency").default('weekly'),
  
  // Auto-Remediation
  autoRemediationEnabled: integer("auto_remediation_enabled").default(1),
  remediationActions: jsonb("remediation_actions").default('[]'),
  
  checkedAt: timestamp("checked_at").defaultNow(),
});

/**
 * SIDE Distribution - سجل توزيع SIDE
 * Tracks SIDE deployment across all external platforms
 */
export const sideDistribution = pgTable("side_distribution", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  platformId: text("platform_id").notNull(),
  packageId: text("package_id").notNull(),
  version: text("version").notNull(),
  
  // Distribution Status
  status: text("status").notNull(), // deployed, failed, pending, removed
  packageChecksum: text("package_checksum"),
  
  // Deployment Info
  deployedAt: timestamp("deployed_at"),
  lastSync: timestamp("last_sync"),
  
  // Compliance Tracking
  complianceScore: integer("compliance_score"),
  
  // Error Handling
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Meeting Rooms - غرف الاجتماعات الافتراضية
 * Virtual meeting rooms for inter-nucleus coordination
 */
export const meetingRooms = pgTable("meeting_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Meeting Identity
  meetingId: text("meeting_id").notNull().unique(),
  title: text("title").notNull(),
  agenda: text("agenda").notNull(),
  
  // Participants
  organizer: text("organizer").notNull().default('nicholas'), // nicholas
  participants: jsonb("participants").notNull().default('[]'), // ['academy', 'side', 'b2b']
  invitedNuclei: jsonb("invited_nuclei").notNull().default('[]'),
  acceptedNuclei: jsonb("accepted_nuclei").default('[]'),
  
  // Meeting Status
  status: text("status").notNull().default('scheduled'), // scheduled, in_progress, completed, cancelled
  meetingType: text("meeting_type").notNull(), // strategic, operational, emergency, voting
  
  // Decisions & Outcomes
  decisions: jsonb("decisions").default('[]'),
  actionItems: jsonb("action_items").default('[]'),
  votingRequired: integer("voting_required").default(0),
  consensusReached: integer("consensus_reached").default(0),
  
  // Timestamps
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Meeting Votes - التصويتات
 * Voting system for strategic decisions
 */
export const meetingVotes = pgTable("meeting_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  meetingId: text("meeting_id").notNull(),
  proposalId: text("proposal_id").notNull(),
  proposalTitle: text("proposal_title").notNull(),
  proposalDescription: text("proposal_description"),
  
  // Voting Details
  nucleusId: text("nucleus_id").notNull(),
  vote: text("vote").notNull(), // approve, reject, abstain
  reasoning: text("reasoning"),
  weight: integer("weight").default(1), // voting weight
  
  // Results
  votedAt: timestamp("voted_at").defaultNow(),
});

/**
 * Empire Decisions - القرارات الإمبراطورية
 * Strategic decisions made by Nicholas across the empire
 */
export const empireDecisions = pgTable("empire_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  decisionId: text("decision_id").notNull().unique(),
  decisionType: text("decision_type").notNull(), // update, enforcement, policy, strategic
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  // Scope & Impact
  scope: text("scope").notNull(), // single_nucleus, category, empire_wide
  affectedNuclei: jsonb("affected_nuclei").notNull().default('[]'),
  priority: text("priority").notNull().default('normal'), // low, normal, high, critical, emergency
  
  // Decision Making
  madeBy: text("made_by").notNull().default('nicholas'),
  decisionBasis: text("decision_basis"), // ai_recommendation, meeting_consensus, emergency
  aiRecommendation: jsonb("ai_recommendation").default('{}'),
  
  // Execution
  status: text("status").notNull().default('pending'), // pending, in_progress, completed, failed, cancelled
  executionPlan: jsonb("execution_plan").default('{}'),
  executionResults: jsonb("execution_results").default('{}'),
  
  // Rollback Capability
  rollbackPossible: integer("rollback_possible").default(1),
  rollbackPlan: jsonb("rollback_plan").default('{}'),
  
  // Timestamps
  decidedAt: timestamp("decided_at").defaultNow(),
  executionStarted: timestamp("execution_started"),
  executionCompleted: timestamp("execution_completed"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Auto Updates - سجل التحديثات التلقائية
 * Automatic update enforcement and tracking
 */
export const autoUpdates = pgTable("auto_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Update Identity
  updateId: text("update_id").notNull().unique(),
  updateType: text("update_type").notNull(), // side, phase_omega, security, feature
  version: text("version").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  
  // Enforcement
  mandatory: integer("mandatory").notNull().default(1), // 1=mandatory, 0=optional
  enforcementMode: text("enforcement_mode").notNull().default('immediate'), // immediate, scheduled, gradual
  
  // Deployment
  targetNuclei: jsonb("target_nuclei").notNull().default('[]'), // [] = all nuclei
  deploymentStatus: text("deployment_status").notNull().default('pending'),
  
  // Results
  totalNuclei: integer("total_nuclei").default(0),
  successfulUpdates: integer("successful_updates").default(0),
  failedUpdates: integer("failed_updates").default(0),
  pendingUpdates: integer("pending_updates").default(0),
  
  deploymentResults: jsonb("deployment_results").default('{}'),
  
  // Rollback
  rollbackAvailable: integer("rollback_available").default(1),
  rolledBack: integer("rolled_back").default(0),
  
  // Timestamps
  scheduledAt: timestamp("scheduled_at"),
  deploymentStarted: timestamp("deployment_started"),
  deploymentCompleted: timestamp("deployment_completed"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Platform Heartbeats - نبضات قلب المنصات
 * Real-time heartbeat signals from external platforms
 */
export const platformHeartbeats = pgTable("platform_heartbeats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Platform Identity
  platformId: text("platform_id").notNull(),
  platformName: text("platform_name").notNull(),
  
  // SIDE Status
  sideInstalled: integer("side_installed").notNull().default(0), // 1=installed, 0=not installed
  sideVersion: text("side_version"),
  sideActive: integer("side_active").notNull().default(0), // 1=active, 0=inactive
  
  // Health Metrics
  status: text("status").notNull().default('unknown'), // online, offline, degraded, unknown
  cpuUsage: integer("cpu_usage"), // 0-100
  memoryUsage: integer("memory_usage"), // 0-100
  responseTime: integer("response_time"), // milliseconds
  
  // Compliance
  complianceScore: integer("compliance_score"), // 0-100
  codeQualityScore: integer("code_quality_score"), // 0-100
  securityScore: integer("security_score"), // 0-100
  
  // Additional Data
  metadata: jsonb("metadata").default('{}'),
  ipAddress: text("ip_address"),
  
  // Timestamps
  heartbeatAt: timestamp("heartbeat_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Platform Verification - سجل عمليات الفحص
 * Auto-verification checks performed by Nicholas
 */
export const platformVerification = pgTable("platform_verification", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Platform Identity
  platformId: text("platform_id").notNull(),
  platformName: text("platform_name").notNull(),
  platformUrl: text("platform_url"),
  
  // Verification Type
  verificationType: text("verification_type").notNull(), // side_installation, side_version, health_check, compliance_check
  
  // Results
  verificationStatus: text("verification_status").notNull(), // success, failed, timeout, unreachable
  sideDetected: integer("side_detected").default(0), // 1=detected, 0=not detected
  sideVersion: text("side_version"),
  
  // Details
  responseCode: integer("response_code"), // HTTP status code
  responseTime: integer("response_time"), // milliseconds
  errorMessage: text("error_message"),
  verificationData: jsonb("verification_data").default('{}'),
  
  // Timestamps
  verifiedAt: timestamp("verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Platform Health Status - الحالة الصحية للمنصات
 * Current health status of all platforms (real-time view)
 */
export const platformHealthStatus = pgTable("platform_health_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Platform Identity
  platformId: text("platform_id").notNull().unique(),
  platformName: text("platform_name").notNull(),
  platformUrl: text("platform_url"),
  platformType: text("platform_type"), // communication, accounting, commerce, etc.
  priority: text("priority").notNull().default('normal'), // critical, high, normal, low
  
  // Current Status
  currentStatus: text("current_status").notNull().default('unknown'), // online, offline, degraded, unknown
  sideInstalled: integer("side_installed").default(0),
  sideVersion: text("side_version"),
  sideActive: integer("side_active").default(0),
  
  // Health Metrics
  healthScore: integer("health_score").default(0), // 0-100 overall health
  complianceScore: integer("compliance_score").default(0), // 0-100
  uptime: real("uptime").default(0), // percentage
  
  // Last Activity
  lastHeartbeat: timestamp("last_heartbeat"),
  lastVerification: timestamp("last_verification"),
  lastOnline: timestamp("last_online"),
  
  // Alerts
  hasAlerts: integer("has_alerts").default(0), // 1=has active alerts
  alertCount: integer("alert_count").default(0),
  alertLevel: text("alert_level"), // info, warning, error, critical
  
  // Statistics
  totalHeartbeats: integer("total_heartbeats").default(0),
  totalVerifications: integer("total_verifications").default(0),
  failedVerifications: integer("failed_verifications").default(0),
  
  // Timestamps
  statusChangedAt: timestamp("status_changed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for Command Center tables
export const insertCommandCenterNucleiSchema = createInsertSchema(commandCenterNuclei).omit({
  id: true,
  registeredAt: true,
  lastUpdated: true,
});
export const insertHealthChecksSchema = createInsertSchema(healthChecks).omit({
  id: true,
  checkedAt: true,
});
export const insertNucleiAlertsSchema = createInsertSchema(nucleiAlerts).omit({
  id: true,
  createdAt: true,
});
export const insertSideComplianceSchema = createInsertSchema(sideCompliance).omit({
  id: true,
  checkedAt: true,
});
export const insertSideDistributionSchema = createInsertSchema(sideDistribution).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMeetingRoomsSchema = createInsertSchema(meetingRooms).omit({
  id: true,
  createdAt: true,
});
export const insertMeetingVotesSchema = createInsertSchema(meetingVotes).omit({
  id: true,
  votedAt: true,
});
export const insertEmpireDecisionsSchema = createInsertSchema(empireDecisions).omit({
  id: true,
  createdAt: true,
});
export const insertAutoUpdatesSchema = createInsertSchema(autoUpdates).omit({
  id: true,
  createdAt: true,
});
export const insertPlatformHeartbeatsSchema = createInsertSchema(platformHeartbeats).omit({
  id: true,
  createdAt: true,
  heartbeatAt: true,
});
export const insertPlatformVerificationSchema = createInsertSchema(platformVerification).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});
export const insertPlatformHealthStatusSchema = createInsertSchema(platformHealthStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types for Command Center
export type InsertCommandCenterNucleus = z.infer<typeof insertCommandCenterNucleiSchema>;
export type SelectCommandCenterNucleus = typeof commandCenterNuclei.$inferSelect;
export type InsertHealthCheck = z.infer<typeof insertHealthChecksSchema>;
export type SelectHealthCheck = typeof healthChecks.$inferSelect;
export type InsertNucleiAlert = z.infer<typeof insertNucleiAlertsSchema>;
export type SelectNucleiAlert = typeof nucleiAlerts.$inferSelect;
export type InsertSideCompliance = z.infer<typeof insertSideComplianceSchema>;
export type SelectSideCompliance = typeof sideCompliance.$inferSelect;
export type InsertSideDistribution = z.infer<typeof insertSideDistributionSchema>;
export type SelectSideDistribution = typeof sideDistribution.$inferSelect;
export type InsertMeetingRoom = z.infer<typeof insertMeetingRoomsSchema>;
export type SelectMeetingRoom = typeof meetingRooms.$inferSelect;
export type InsertMeetingVote = z.infer<typeof insertMeetingVotesSchema>;
export type SelectMeetingVote = typeof meetingVotes.$inferSelect;
export type InsertEmpireDecision = z.infer<typeof insertEmpireDecisionsSchema>;
export type SelectEmpireDecision = typeof empireDecisions.$inferSelect;
export type InsertAutoUpdate = z.infer<typeof insertAutoUpdatesSchema>;
export type SelectAutoUpdate = typeof autoUpdates.$inferSelect;
export type InsertPlatformHeartbeat = z.infer<typeof insertPlatformHeartbeatsSchema>;
export type SelectPlatformHeartbeat = typeof platformHeartbeats.$inferSelect;
export type InsertPlatformVerification = z.infer<typeof insertPlatformVerificationSchema>;
export type SelectPlatformVerification = typeof platformVerification.$inferSelect;
export type InsertPlatformHealthStatus = z.infer<typeof insertPlatformHealthStatusSchema>;
export type SelectPlatformHealthStatus = typeof platformHealthStatus.$inferSelect;

// ============= PHASE 5.1 → 7.0: ASSISTED EXECUTION LAYER =============

/**
 * Patches - التصحيحات المقترحة
 * Nicholas generates patches based on problem diagnostics
 */
export const patches = pgTable("patches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source & Context
  sourceType: text("source_type").notNull(), // 'awareness', 'manual', 'auto-evolution'
  sourceId: text("source_id"), // reference to problem diagnosis or other source
  nucleusId: text("nucleus_id").notNull(), // which nucleus this patch targets
  
  // Patch Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  patchType: text("patch_type").notNull(), // 'performance', 'integration', 'security', 'data', 'feature'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Technical Details
  targetFiles: jsonb("target_files").notNull(), // [{path: '', changes: ''}]
  codeChanges: jsonb("code_changes").notNull(), // {before: '', after: ''}
  dependencies: jsonb("dependencies"), // other patches this depends on
  
  // Impact Assessment
  estimatedImpact: text("estimated_impact"), // description of expected improvements
  riskLevel: text("risk_level").notNull().default('medium'), // 'low', 'medium', 'high'
  rollbackPlan: text("rollback_plan"), // how to revert if needed
  
  // Status & Lifecycle
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'executing', 'completed', 'failed', 'rolled_back'
  approvalId: text("approval_id"), // reference to approval record
  executionId: text("execution_id"), // reference to execution run
  
  // Metadata
  createdBy: text("created_by").notNull().default('nicholas-core'),
  metadata: jsonb("metadata"), // additional context
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Approvals - نظام الموافقات
 * User approval workflow for patches
 */
export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  patchId: text("patch_id").notNull().references(() => patches.id, { onDelete: 'cascade' }),
  
  // Approval Details
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'modified'
  approvedBy: text("approved_by"), // user ID or 'auto-approved'
  approvalReason: text("approval_reason"), // why approved/rejected
  
  // Modifications (if user requests changes)
  requestedChanges: jsonb("requested_changes"), // modifications requested by user
  
  // Auto-approval rules
  autoApproved: integer("auto_approved").notNull().default(0), // 1 if auto-approved
  autoApprovalRule: text("auto_approval_rule"), // which rule triggered auto-approval
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

/**
 * Execution Runs - سجل التنفيذ
 * Tracks execution of approved patches
 */
export const executionRuns = pgTable("execution_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  patchId: text("patch_id").notNull().references(() => patches.id, { onDelete: 'cascade' }),
  approvalId: text("approval_id").references(() => approvals.id),
  
  // Execution Context
  executionMode: text("execution_mode").notNull().default('sandbox'), // 'sandbox', 'production'
  executor: text("executor").notNull().default('nicholas-executor'),
  
  // Status
  status: text("status").notNull().default('queued'), // 'queued', 'running', 'success', 'failed', 'rolled_back'
  progress: integer("progress").notNull().default(0), // 0-100
  currentStep: text("current_step"), // which step is currently executing
  
  // Results
  output: jsonb("output"), // execution output/logs
  errorDetails: jsonb("error_details"), // if failed
  performanceMetrics: jsonb("performance_metrics"), // execution time, resource usage
  
  // Rollback
  rollbackRequired: integer("rollback_required").notNull().default(0),
  rollbackCompleted: integer("rollback_completed").notNull().default(0),
  rollbackDetails: jsonb("rollback_details"),
  
  // Timestamps
  queuedAt: timestamp("queued_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

/**
 * Execution Results - نتائج التنفيذ
 * Detailed results and telemetry from executions
 */
export const executionResults = pgTable("execution_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  executionId: text("execution_id").notNull().references(() => executionRuns.id, { onDelete: 'cascade' }),
  patchId: text("patch_id").notNull().references(() => patches.id),
  
  // Results
  success: integer("success").notNull(), // 1=success, 0=failed
  impactRealized: text("impact_realized"), // actual improvements observed
  performanceChange: jsonb("performance_change"), // before/after metrics
  
  // Telemetry
  executionTime: integer("execution_time"), // milliseconds
  resourceUsage: jsonb("resource_usage"), // CPU, memory, etc.
  affectedSystems: jsonb("affected_systems"), // which systems were impacted
  
  // Verification
  verified: integer("verified").notNull().default(0), // 1 if results verified
  verificationDetails: jsonb("verification_details"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert & Select Schemas for Assisted Execution
export const insertPatchSchema = createInsertSchema(patches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});
export const insertExecutionRunSchema = createInsertSchema(executionRuns).omit({
  id: true,
  queuedAt: true,
  startedAt: true,
  completedAt: true,
});
export const insertExecutionResultSchema = createInsertSchema(executionResults).omit({
  id: true,
  createdAt: true,
});

// TypeScript types for Assisted Execution
export type InsertPatch = z.infer<typeof insertPatchSchema>;
export type SelectPatch = typeof patches.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type SelectApproval = typeof approvals.$inferSelect;
export type InsertExecutionRun = z.infer<typeof insertExecutionRunSchema>;
export type SelectExecutionRun = typeof executionRuns.$inferSelect;
export type InsertExecutionResult = z.infer<typeof insertExecutionResultSchema>;
export type SelectExecutionResult = typeof executionResults.$inferSelect;

// ============================================
// PHASE 7.1 → 8.6: COLLECTIVE INTELLIGENCE
// ============================================

/**
 * Collective Sessions - جلسات القرار الجماعي
 * Multi-nucleus collaborative decision-making sessions
 */
export const collectiveSessions = pgTable("collective_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Session Context
  topic: text("topic").notNull(), // what decision is being made
  description: text("description").notNull(),
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(), // 'strategic', 'operational', 'technical', 'financial'
  
  // Participants
  initiatorNucleus: text("initiator_nucleus").notNull(), // which nucleus started the session
  participantNuclei: jsonb("participant_nuclei").notNull(), // array of nucleus IDs
  requiredConsensus: integer("required_consensus").notNull().default(60), // % needed to decide
  
  // Status & Results
  status: text("status").notNull().default('open'), // 'open', 'voting', 'decided', 'cancelled'
  finalDecision: text("final_decision"), // the collective decision made
  consensusLevel: integer("consensus_level"), // % of agreement achieved
  dissenting: jsonb("dissenting"), // nuclei that disagreed and why
  
  // Timing
  startedAt: timestamp("started_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
  expiresAt: timestamp("expires_at"), // deadline for decision
});

/**
 * Collective Decisions - القرارات الجماعية
 * Individual votes/inputs from each nucleus in a collective session
 */
export const collectiveDecisions = pgTable("collective_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  sessionId: text("session_id").notNull().references(() => collectiveSessions.id, { onDelete: 'cascade' }),
  nucleusId: text("nucleus_id").notNull(), // which nucleus is voting
  
  // Vote/Input
  position: text("position").notNull(), // 'support', 'oppose', 'abstain', 'conditional'
  reasoning: text("reasoning").notNull(), // AI-generated explanation
  confidence: integer("confidence").notNull().default(70), // 0-100 how confident the nucleus is
  
  // Supporting Data
  evidenceProvided: jsonb("evidence_provided"), // data/insights supporting this position
  alternativeProposal: text("alternative_proposal"), // if opposing, what's the alternative
  conditions: jsonb("conditions"), // if conditional support, what conditions
  
  // Weight & Influence
  voteWeight: integer("vote_weight").notNull().default(1), // some nuclei may have more weight
  influenceScore: integer("influence_score"), // calculated influence of this vote
  
  // Timestamps
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  // Enforce: one vote per nucleus per session
  uniqueVote: unique("unique_vote_per_nucleus").on(table.sessionId, table.nucleusId),
}));

/**
 * Intelligence Exchanges - تبادل المعلومات
 * Nucleus-to-nucleus knowledge/intelligence sharing
 */
export const intelligenceExchanges = pgTable("intelligence_exchanges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Participants
  senderNucleus: text("sender_nucleus").notNull(),
  receiverNuclei: jsonb("receiver_nuclei").notNull(), // array of recipient nucleus IDs
  
  // Content
  exchangeType: text("exchange_type").notNull(), // 'insight', 'pattern', 'alert', 'knowledge', 'request'
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default('normal'), // 'low', 'normal', 'high', 'urgent'
  
  // Classification
  category: text("category").notNull(), // 'technical', 'business', 'security', 'performance'
  tags: jsonb("tags"), // array of tags for categorization
  
  // Intelligence Value
  confidenceScore: integer("confidence_score").notNull().default(70), // how confident is the sender
  relevanceScore: integer("relevance_score"), // calculated relevance to receivers
  actionRequired: integer("action_required").notNull().default(0), // 1 if requires action
  
  // Metadata
  sourceData: jsonb("source_data"), // originating data/context
  attachments: jsonb("attachments"), // files, links, references
  
  // Tracking
  acknowledged: jsonb("acknowledged"), // which nuclei acknowledged receipt
  actedUpon: jsonb("acted_upon"), // which nuclei took action
  
  // Timestamps
  sentAt: timestamp("sent_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // intelligence may have shelf life
});

// Note: cognitiveBusMessages moved to Phase Ω.2 section

// Insert & Select Schemas for Collective Intelligence
export const insertCollectiveSessionSchema = createInsertSchema(collectiveSessions).omit({
  id: true,
  startedAt: true,
  decidedAt: true,
});
export const insertCollectiveDecisionSchema = createInsertSchema(collectiveDecisions).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});
export const insertIntelligenceExchangeSchema = createInsertSchema(intelligenceExchanges).omit({
  id: true,
  sentAt: true,
});

// TypeScript types for Collective Intelligence
export type InsertCollectiveSession = z.infer<typeof insertCollectiveSessionSchema>;
export type SelectCollectiveSession = typeof collectiveSessions.$inferSelect;
export type InsertCollectiveDecision = z.infer<typeof insertCollectiveDecisionSchema>;
export type SelectCollectiveDecision = typeof collectiveDecisions.$inferSelect;
export type InsertIntelligenceExchange = z.infer<typeof insertIntelligenceExchangeSchema>;
export type SelectIntelligenceExchange = typeof intelligenceExchanges.$inferSelect;

// ============= PHASE 8.7 → 9.6: EVOLUTION & MONITORING =============

/**
 * Performance Metrics - مقاييس الأداء
 */
export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nucleusId: text("nucleus_id").notNull(),
  metricType: text("metric_type").notNull(),
  metricValue: numeric("metric_value").notNull(),
  unit: text("unit").notNull().default('score'),
  contextData: jsonb("context_data"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

/**
 * Performance Patterns - أنماط الأداء
 */
export const performancePatterns = pgTable("performance_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nucleusId: text("nucleus_id").notNull(),
  patternType: text("pattern_type").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  detectedMetrics: jsonb("detected_metrics"),
  frequency: integer("frequency").notNull().default(1),
  confidence: numeric("confidence").notNull().default('0.75'),
  detectedAt: timestamp("detected_at").defaultNow(),
});

/**
 * Optimization Recommendations - توصيات التحسين
 */
export const optimizationRecommendations = pgTable("optimization_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternId: text("pattern_id"),
  nucleusId: text("nucleus_id").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(),
  actionPlan: jsonb("action_plan"),
  estimatedImpact: text("estimated_impact"),
  status: text("status").notNull().default('pending'),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= PHASE 9.7 → 10.3: AUTO-REPAIR =============

/**
 * Anomaly Detections - اكتشاف الشذوذ
 */
export const anomalyDetections = pgTable("anomaly_detections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nucleusId: text("nucleus_id").notNull(),
  component: text("component").notNull(),
  anomalyType: text("anomaly_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  detectedMetrics: jsonb("detected_metrics"),
  status: text("status").notNull().default('detected'),
  autoRepairEligible: integer("auto_repair_eligible").notNull().default(0),
  detectedAt: timestamp("detected_at").defaultNow(),
  repairedAt: timestamp("repaired_at"),
});

/**
 * Repair Agents - وكلاء الإصلاح
 */
export const repairAgents = pgTable("repair_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  anomalyId: text("anomaly_id").notNull(),
  agentType: text("agent_type").notNull(),
  repairStrategy: text("repair_strategy").notNull(),
  strategyDetails: jsonb("strategy_details"),
  status: text("status").notNull().default('deploying'),
  priority: text("priority").notNull(),
  successRate: numeric("success_rate"),
  actionsExecuted: integer("actions_executed").notNull().default(0),
  deployedAt: timestamp("deployed_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

/**
 * Repair Actions - إجراءات الإصلاح
 */
export const repairActions = pgTable("repair_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: text("agent_id").notNull(),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  result: jsonb("result"),
  executedAt: timestamp("executed_at").defaultNow(),
});

// ============= PHASE 10.4 → 10.8: AUTO-BUILDER =============

/**
 * Build Requests - طلبات البناء
 */
export const buildRequests = pgTable("build_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemName: text("system_name").notNull(),
  systemType: text("system_type").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").notNull(),
  targetNucleus: text("target_nucleus").notNull().default('nicholas'),
  status: text("status").notNull().default('pending'),
  priority: text("priority").notNull(),
  generatedCodeCount: integer("generated_code_count").notNull().default(0),
  deploymentId: text("deployment_id"),
  buildLogs: jsonb("build_logs"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

/**
 * Build Templates - قوالب البناء
 */
export const buildTemplates = pgTable("build_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  templateType: text("template_type").notNull(),
  baseStructure: jsonb("base_structure").notNull(),
  codePatterns: jsonb("code_patterns").notNull(),
  version: text("version").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

/**
 * Generated Code - الكود المُولّد
 */
export const generatedCode = pgTable("generated_code", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildRequestId: text("build_request_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  codeContent: text("code_content").notNull(),
  language: text("language").notNull(),
  linesOfCode: integer("lines_of_code").notNull().default(0),
  status: text("status").notNull().default('generated'),
  generatedAt: timestamp("generated_at").defaultNow(),
});

/**
 * Build Deployments - نشر البناء
 */
export const buildDeployments = pgTable("build_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildRequestId: text("build_request_id").notNull(),
  environment: text("environment").notNull(),
  deploymentType: text("deployment_type").notNull(),
  status: text("status").notNull().default('pending'),
  filesDeployed: integer("files_deployed").notNull().default(0),
  deploymentUrl: text("deployment_url"),
  createdAt: timestamp("created_at").defaultNow(),
  deployedAt: timestamp("deployed_at"),
});

// ============= PHASE 10.9 → 11.0: AUTONOMOUS DECISION =============

/**
 * Decision Criteria - معايير القرار
 */
export const decisionCriteria = pgTable("decision_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  decisionId: text("decision_id").notNull(),
  criterionName: text("criterion_name").notNull(),
  criterionWeight: numeric("criterion_weight").notNull(),
  score: numeric("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Decision Outcomes - نتائج القرارات
 */
export const decisionOutcomes = pgTable("decision_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  decisionId: text("decision_id").notNull(),
  success: integer("success").notNull(),
  actualResult: text("actual_result").notNull(),
  deviationFromExpected: text("deviation_from_expected"),
  lessonsLearned: jsonb("lessons_learned"),
  impactRealized: text("impact_realized"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

/**
 * Autonomy Settings - إعدادات الاستقلالية
 */
export const autonomySettings = pgTable("autonomy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// ============= PHASE 5.1 → 7.0: ASSISTED EXECUTION LAYER =============

/**
 * Execution Patches - التصحيحات البرمجية
 */
export const executionPatches = pgTable("execution_patches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: text("issue_id"), // Reference to detected issue
  patchContent: text("patch_content").notNull(), // Git diff format
  explanation: text("explanation").notNull(),
  affectedFiles: jsonb("affected_files").notNull().$type<string[]>(),
  status: text("status").notNull().default('pending'), // pending, approved, rejected, executed, failed
  validationScore: integer("validation_score"), // 0-100
  validationErrors: jsonb("validation_errors").$type<string[]>(),
  confidence: integer("confidence"), // 0-100 confidence score from PatchGenerator
  aiModel: text("ai_model"), // AI model used to generate patch (e.g., gpt-4o)
  estimatedImpact: text("estimated_impact"), // Human-readable impact description
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by"),
  executedAt: timestamp("executed_at"),
  executionResult: text("execution_result"),
  rollbackAvailable: integer("rollback_available").notNull().default(1), // 1=yes, 0=no
});

/**
 * Execution Approvals - طلبات الموافقة
 */
export const executionApprovals = pgTable("execution_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patchId: varchar("patch_id").notNull().references(() => executionPatches.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  approverNotes: text("approver_notes"),
});

/**
 * Execution Audit - سجل التدقيق
 */
export const executionAudit = pgTable("execution_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patchId: varchar("patch_id").references(() => executionPatches.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // generated, validated, approved, executed, rolled_back
  actor: text("actor").notNull(), // system, user:{username}
  timestamp: timestamp("timestamp").defaultNow(),
  details: jsonb("details"), // Additional context
  signature: text("signature"), // HMAC signature
});

/**
 * Build Errors - أخطاء البناء
 */
export const buildErrors = pgTable("build_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  errorType: text("error_type").notNull(), // npm, typescript, webpack, dependency
  errorMessage: text("error_message").notNull(),
  affectedFiles: jsonb("affected_files").$type<string[]>(),
  severity: text("severity").notNull(), // critical, high, medium, low
  status: text("status").notNull().default('detected'), // detected, fixing, fixed, failed
  autoFixAttempted: integer("auto_fix_attempted").notNull().default(0), // 1=yes, 0=no
  autoFixSuccess: integer("auto_fix_success"), // 1=yes, 0=no, null=not attempted
  detectedAt: timestamp("detected_at").defaultNow(),
  fixedAt: timestamp("fixed_at"),
});

// ============= INSERT SCHEMAS & TYPES =============

// Phase 8: Evolution & Monitoring
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({ 
  id: true, 
  recordedAt: true 
});

export const insertPerformancePatternSchema = createInsertSchema(performancePatterns).omit({ 
  id: true, 
  detectedAt: true 
});

export const insertOptimizationRecommendationSchema = createInsertSchema(optimizationRecommendations).omit({ 
  id: true, 
  createdAt: true 
});

// Phase 9: Auto-Repair
export const insertAnomalyDetectionSchema = createInsertSchema(anomalyDetections).omit({ 
  id: true, 
  detectedAt: true 
});

export const insertRepairAgentSchema = createInsertSchema(repairAgents).omit({ 
  id: true, 
  deployedAt: true 
});

export const insertRepairActionSchema = createInsertSchema(repairActions).omit({ 
  id: true, 
  executedAt: true 
});

// Phase 10: Auto-Builder
export const insertBuildRequestSchema = createInsertSchema(buildRequests).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBuildTemplateSchema = createInsertSchema(buildTemplates).omit({ 
  id: true, 
  createdAt: true 
});

export const insertGeneratedCodeSchema = createInsertSchema(generatedCode).omit({ 
  id: true, 
  generatedAt: true 
});

export const insertBuildDeploymentSchema = createInsertSchema(buildDeployments).omit({ 
  id: true, 
  createdAt: true 
});

// Phase 11: Autonomous Decision
export const insertDecisionCriterionSchema = createInsertSchema(decisionCriteria).omit({ 
  id: true, 
  createdAt: true 
});

export const insertDecisionOutcomeSchema = createInsertSchema(decisionOutcomes).omit({ 
  id: true, 
  recordedAt: true 
});

export const insertAutonomySettingSchema = createInsertSchema(autonomySettings).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type InsertPerformancePattern = z.infer<typeof insertPerformancePatternSchema>;
export type InsertOptimizationRecommendation = z.infer<typeof insertOptimizationRecommendationSchema>;
export type InsertAnomalyDetection = z.infer<typeof insertAnomalyDetectionSchema>;
export type InsertRepairAgent = z.infer<typeof insertRepairAgentSchema>;
export type InsertRepairAction = z.infer<typeof insertRepairActionSchema>;
export type InsertBuildRequest = z.infer<typeof insertBuildRequestSchema>;
export type InsertBuildTemplate = z.infer<typeof insertBuildTemplateSchema>;
export type InsertGeneratedCode = z.infer<typeof insertGeneratedCodeSchema>;
export type InsertBuildDeployment = z.infer<typeof insertBuildDeploymentSchema>;
export type InsertDecisionCriterion = z.infer<typeof insertDecisionCriterionSchema>;
export type InsertDecisionOutcome = z.infer<typeof insertDecisionOutcomeSchema>;
export type InsertAutonomySetting = z.infer<typeof insertAutonomySettingSchema>;

// Phase 5-7: Assisted Execution Layer
export const insertExecutionPatchSchema = createInsertSchema(executionPatches).omit({
  id: true,
  createdAt: true
});

export const insertExecutionApprovalSchema = createInsertSchema(executionApprovals).omit({
  id: true,
  requestedAt: true
});

export const insertExecutionAuditSchema = createInsertSchema(executionAudit).omit({
  id: true,
  timestamp: true
});

export const insertBuildErrorSchema = createInsertSchema(buildErrors).omit({
  id: true,
  detectedAt: true
});

export type ExecutionPatch = typeof executionPatches.$inferSelect;
export type InsertExecutionPatch = z.infer<typeof insertExecutionPatchSchema>;
export type ExecutionApproval = typeof executionApprovals.$inferSelect;
export type InsertExecutionApproval = z.infer<typeof insertExecutionApprovalSchema>;
export type ExecutionAudit = typeof executionAudit.$inferSelect;
export type InsertExecutionAudit = z.infer<typeof insertExecutionAuditSchema>;
export type BuildError = typeof buildErrors.$inferSelect;
export type InsertBuildError = z.infer<typeof insertBuildErrorSchema>;

// ============================================
// EVOLUTION & MONITORING LAYER (Phase 8.7 → 9.6)
// ============================================

/**
 * Evolution Runs - دورات التطور
 * Tracks each evolution/learning cycle
 */
export const evolutionRuns = pgTable("evolution_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Run Info
  runType: text("run_type").notNull(), // 'scheduled', 'triggered', 'emergency'
  status: text("status").notNull().default('running'), // 'running', 'completed', 'failed'
  
  // Scope
  targetNuclei: jsonb("target_nuclei").notNull(), // array of nucleus IDs being monitored
  metricsCollected: integer("metrics_collected").notNull().default(0),
  
  // Results
  fitnessScoreAvg: numeric("fitness_score_avg", { precision: 5, scale: 2 }), // 0-100
  improvementsProposed: integer("improvements_proposed").default(0),
  improvementsApplied: integer("improvements_applied").default(0),
  
  // Performance
  duration: integer("duration"), // milliseconds
  
  // Timestamps
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

/**
 * Evolution Metrics - المقاييس التشغيلية
 * Real-time operational metrics from each nucleus
 */
export const evolutionMetrics = pgTable("evolution_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  runId: text("run_id").notNull().references(() => evolutionRuns.id, { onDelete: 'cascade' }),
  nucleusId: text("nucleus_id").notNull(), // which nucleus this metric is from
  
  // Metric Type
  metricType: text("metric_type").notNull(), // 'latency', 'errors', 'throughput', 'resources'
  metricName: text("metric_name").notNull(), // specific metric name
  
  // Values
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // 'ms', 'count', 'percentage', 'bytes'
  
  // Context
  operation: text("operation"), // which operation this metric relates to
  endpoint: text("endpoint"), // API endpoint if applicable
  
  // Metadata
  tags: jsonb("tags"), // additional context tags
  
  // Timestamp
  collectedAt: timestamp("collected_at").defaultNow(),
});

/**
 * Fitness Scores - درجات الكفاءة
 * Calculated fitness scores for nuclei/operations
 */
export const fitnessScores = pgTable("fitness_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  runId: text("run_id").notNull().references(() => evolutionRuns.id, { onDelete: 'cascade' }),
  nucleusId: text("nucleus_id").notNull(),
  
  // Score Components (0-100 each)
  executionSuccessScore: numeric("execution_success_score", { precision: 5, scale: 2 }),
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  reliabilityScore: numeric("reliability_score", { precision: 5, scale: 2 }),
  resourceEfficiencyScore: numeric("resource_efficiency_score", { precision: 5, scale: 2 }),
  consensusQualityScore: numeric("consensus_quality_score", { precision: 5, scale: 2 }),
  
  // Overall Fitness (weighted average)
  overallFitness: numeric("overall_fitness", { precision: 5, scale: 2 }).notNull(), // 0-100
  
  // Trend
  previousFitness: numeric("previous_fitness", { precision: 5, scale: 2 }), // from last run
  trendDirection: text("trend_direction"), // 'improving', 'declining', 'stable'
  
  // Analysis
  strengths: jsonb("strengths"), // array of strength areas
  weaknesses: jsonb("weaknesses"), // array of improvement areas
  recommendations: jsonb("recommendations"), // suggested actions
  
  // Timestamp
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

/**
 * Improvement Actions - الإجراءات التحسينية
 * Proposed and executed improvement actions
 */
export const improvementActions = pgTable("improvement_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference
  runId: text("run_id").notNull().references(() => evolutionRuns.id, { onDelete: 'cascade' }),
  fitnessScoreId: text("fitness_score_id").references(() => fitnessScores.id),
  
  // Action Details
  actionType: text("action_type").notNull(), // 'optimization', 'refactor', 'config_change', 'scaling'
  targetNucleus: text("target_nucleus").notNull(),
  targetComponent: text("target_component").notNull(), // file/module/service affected
  
  // Description
  title: text("title").notNull(),
  description: text("description").notNull(),
  expectedImpact: text("expected_impact"), // what improvement is expected
  
  // Safety & Approval
  safetyLevel: text("safety_level").notNull().default('supervised'), // 'auto-safe', 'supervised', 'blocked'
  requiresApproval: integer("requires_approval").notNull().default(1), // 1=yes, 0=no
  approvalStatus: text("approval_status").default('pending'), // 'pending', 'approved', 'rejected'
  approvedBy: text("approved_by"), // user ID who approved
  
  // Execution
  executionStatus: text("execution_status").default('proposed'), // 'proposed', 'queued', 'executing', 'completed', 'failed', 'rolled_back'
  executionPatchId: text("execution_patch_id"), // link to executionPatches if executed
  
  // Results
  actualImpact: text("actual_impact"), // measured improvement after execution
  fitnessImprovement: numeric("fitness_improvement", { precision: 5, scale: 2 }), // delta in fitness score
  
  // Rollback
  rollbackPlan: jsonb("rollback_plan"), // how to undo this action
  rolledBack: integer("rolled_back").default(0), // 1 if action was rolled back
  
  // Timestamps
  proposedAt: timestamp("proposed_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
});

// Evolution & Monitoring Insert Schemas
export const insertEvolutionRunSchema = createInsertSchema(evolutionRuns).omit({ 
  id: true, 
  startedAt: true 
});

export const insertEvolutionMetricSchema = createInsertSchema(evolutionMetrics).omit({ 
  id: true, 
  collectedAt: true 
});

export const insertFitnessScoreSchema = createInsertSchema(fitnessScores).omit({ 
  id: true, 
  calculatedAt: true 
});

export const insertImprovementActionSchema = createInsertSchema(improvementActions).omit({ 
  id: true, 
  proposedAt: true 
});

// Evolution & Monitoring Types
export type EvolutionRun = typeof evolutionRuns.$inferSelect;
export type InsertEvolutionRun = z.infer<typeof insertEvolutionRunSchema>;
export type EvolutionMetric = typeof evolutionMetrics.$inferSelect;
export type InsertEvolutionMetric = z.infer<typeof insertEvolutionMetricSchema>;
export type FitnessScore = typeof fitnessScores.$inferSelect;
export type InsertFitnessScore = z.infer<typeof insertFitnessScoreSchema>;
export type ImprovementAction = typeof improvementActions.$inferSelect;
export type InsertImprovementAction = z.infer<typeof insertImprovementActionSchema>;

// ============================================
// AUTO-AUDIT CHAIN (Phase 9.7 → 10.3)
// Nicholas + Sida + Academy - Self-Auditing System
// ============================================

/**
 * Audit Commits - تتبع التعديلات البرمجية
 * Automatically analyzes git commits for honesty/compliance
 */
export const auditCommits = pgTable("audit_commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Git Info
  commitHash: text("commit_hash").notNull().unique(),
  commitMessage: text("commit_message").notNull(),
  commitAuthor: text("commit_author").notNull(),
  commitDate: timestamp("commit_date").notNull(),
  
  // Files Changed
  filesModified: jsonb("files_modified").notNull(), // [{path: '', linesAdded: 0, linesRemoved: 0}]
  totalLinesAdded: integer("total_lines_added").notNull().default(0),
  totalLinesRemoved: integer("total_lines_removed").notNull().default(0),
  
  // Audit Analysis
  auditScore: numeric("audit_score", { precision: 5, scale: 2 }).notNull(), // 0-100 honesty score
  auditStatus: text("audit_status").notNull().default('pending'), // 'pending', 'passed', 'flagged', 'failed'
  
  // Detected Issues
  mockDataDetected: integer("mock_data_detected").notNull().default(0), // count of Math.random() etc
  hardcodedValues: integer("hardcoded_values").notNull().default(0), // count of suspicious hardcoded values
  apiIntegrityIssues: integer("api_integrity_issues").notNull().default(0), // endpoints returning fake data
  
  // Compliance
  meetsStandards: integer("meets_standards").notNull().default(1), // 1=yes, 0=no
  complianceNotes: jsonb("compliance_notes"), // [{type: 'warning', message: ''}]
  
  // Auto-Actions
  autoFixed: integer("auto_fixed").notNull().default(0), // 1 if auto-corrected
  fixDetails: text("fix_details"), // what was auto-fixed
  
  // Metadata
  diffContent: text("diff_content"), // git diff output
  analyzedBy: text("analyzed_by").notNull().default('nicholas-audit'), // nicholas-audit, sida-audit, academy-audit
  
  // Timestamps
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Audit Failures - فحوصات فاشلة
 * Records API endpoints that return fake/mock data
 */
export const auditFailures = pgTable("audit_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Nucleus & File Info (NEW for Smart Issue Tracker)
  nucleusName: text("nucleus_name"), // e.g. 'nicholas-core', 'surooh-ai', 'awareness-layer'
  fileName: text("file_name"), // e.g. 'server/consciousness/emotion_simulator.ts'
  moduleType: text("module_type"), // 'api', 'service', 'component', 'system'
  
  // Endpoint Info
  endpoint: text("endpoint").notNull(), // e.g. /api/users/stats
  method: text("method").notNull(), // GET, POST, etc
  pageUrl: text("page_url"), // frontend page that calls this
  
  // Failure Details
  failureType: text("failure_type").notNull(), // 'mock_data', 'hardcoded', 'random_values', 'unavailable', 'error'
  failureReason: text("failure_reason").notNull(),
  stackTrace: text("stack_trace"), // Full error stack trace for debugging (NEW)
  
  // Evidence
  expectedDataSource: text("expected_data_source"), // 'database', 'external_api', 'calculation'
  actualDataSource: text("actual_data_source"), // 'hardcoded', 'Math.random()', 'mock'
  evidenceSnapshot: jsonb("evidence_snapshot"), // sample of the fake data returned
  
  // Impact
  severity: text("severity").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  affectedFeatures: jsonb("affected_features"), // which features are impacted
  
  // Status & Assignment (Enhanced for Issue Tracker)
  status: text("status").notNull().default('detected'), // 'detected', 'acknowledged', 'fixing', 'fixed', 'ignored'
  assignedTo: text("assigned_to"), // who should fix this
  resolvedBy: text("resolved_by"), // who resolved this (NEW)
  resolutionNotes: text("resolution_notes"), // notes about how it was resolved (NEW)
  
  // Fix Tracking
  fixCommitHash: text("fix_commit_hash"), // commit that fixed this
  fixedAt: timestamp("fixed_at"),
  
  // Testing
  testedBy: text("tested_by").notNull().default('sida-test'), // sida-test, nicholas-verify
  testTimestamp: timestamp("test_timestamp").defaultNow(),
  
  // Metadata
  requestPayload: jsonb("request_payload"), // sample request that triggered this
  responsePayload: jsonb("response_payload"), // sample response
  
  // Timestamps
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Audit Integrity - التحقق من صحة البيانات
 * Verifies data displayed in UI matches database/API reality
 */
export const auditIntegrity = pgTable("audit_integrity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source
  sourceType: text("source_type").notNull(), // 'frontend_display', 'api_response', 'database_query'
  sourcePage: text("source_page"), // which page/component
  sourceEndpoint: text("source_endpoint"), // which API endpoint
  
  // Data Being Verified
  fieldName: text("field_name").notNull(), // e.g. 'totalUsers', 'revenue', 'activeAgents'
  displayedValue: text("displayed_value").notNull(), // what the UI shows
  expectedValue: text("expected_value").notNull(), // what DB/API actually has
  
  // Verification
  isMatch: integer("is_match").notNull(), // 1=match, 0=mismatch
  discrepancy: text("discrepancy"), // description of the difference
  discrepancyPercentage: numeric("discrepancy_percentage", { precision: 5, scale: 2 }), // % difference
  
  // Severity & Impact
  severity: text("severity").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  impactDescription: text("impact_description"), // how this affects user trust
  
  // Root Cause
  rootCause: text("root_cause"), // 'stale_cache', 'mock_data', 'calculation_error', 'sync_issue'
  rootCauseDetails: jsonb("root_cause_details"),
  
  // Status
  status: text("status").notNull().default('detected'), // 'detected', 'investigating', 'resolved', 'accepted'
  resolution: text("resolution"), // how it was fixed
  resolvedAt: timestamp("resolved_at"),
  
  // Verification Method
  verifiedBy: text("verified_by").notNull().default('academy-verify'), // academy-verify, nicholas-audit
  verificationMethod: text("verification_method").notNull(), // 'db_query', 'api_call', 'calculation'
  
  // Metadata
  metadata: jsonb("metadata"), // additional context
  evidenceQuery: text("evidence_query"), // SQL query used for verification
  evidenceResponse: jsonb("evidence_response"), // actual DB/API response
  
  // Timestamps
  verifiedAt: timestamp("verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Audit Alerts - تنبيهات المراجعة
 * Critical alerts sent to dashboard when fraud/mock data detected
 */
export const auditAlerts = pgTable("audit_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Alert Type
  alertType: text("alert_type").notNull(), // 'mock_data', 'integrity_breach', 'compliance_violation', 'commit_flagged'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Source
  sourceTable: text("source_table").notNull(), // 'audit_commits', 'audit_failures', 'audit_integrity'
  sourceId: text("source_id").notNull(), // ID of the source record
  
  // Alert Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedComponents: jsonb("affected_components"), // which parts of system are affected
  
  // Evidence
  evidenceSummary: jsonb("evidence_summary"), // key evidence points
  detectionDetails: jsonb("detection_details"), // how it was detected
  
  // Actions
  recommendedAction: text("recommended_action").notNull(), // what should be done
  autoActionTaken: text("auto_action_taken"), // if system auto-fixed anything
  
  // Status
  status: text("status").notNull().default('active'), // 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledgedBy: text("acknowledged_by"), // user who acknowledged
  acknowledgedAt: timestamp("acknowledged_at"),
  
  // Resolution
  resolvedBy: text("resolved_by"),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  
  // Audit Trail
  detectedBy: text("detected_by").notNull(), // 'nicholas', 'sida', 'academy'
  notificationSent: integer("notification_sent").notNull().default(0), // 1=sent to dashboard
  
  // Timestamps
  triggeredAt: timestamp("triggered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= REPAIR HISTORY SYSTEM =============

export const repairHistory = pgTable("repair_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Incident Tracking
  incidentId: text("incident_id").notNull(), // reference to audit finding
  programmerId: text("programmer_id").notNull(), // who caused the issue
  nucleusId: text("nucleus_id").notNull(), // which nucleus/platform
  
  // Issue Details
  issueType: text("issue_type").notNull(), // mock_data, hardcoded_value, fake_api, etc
  severity: text("severity").notNull(), // critical, high, medium, low
  description: text("description").notNull(),
  affectedFiles: jsonb("affected_files").notNull(), // [file paths]
  
  // Repair Action
  action: text("action").notNull(), // auto_fixed, manual_review, ignored, deferred
  status: text("status").notNull(), // pending, in_progress, completed, failed, rolled_back
  
  // Technical Details
  appliedPatch: text("applied_patch"), // code changes applied
  verificationResults: jsonb("verification_results"), // test results, validation
  rollbackPerformed: integer("rollback_performed").notNull().default(0), // 0=no, 1=yes
  
  // Trust & Compliance
  trustImpact: integer("trust_impact").notNull().default(0), // -10 to +10
  signedHash: text("signed_hash").notNull(), // SHA256 signature for immutability
  
  // Metadata
  metadata: jsonb("metadata"), // extra context
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Insert Schemas
export const insertAuditCommitSchema = createInsertSchema(auditCommits).omit({
  id: true,
  analyzedAt: true,
  createdAt: true,
});

export const insertAuditFailureSchema = createInsertSchema(auditFailures).omit({
  id: true,
  detectedAt: true,
  createdAt: true,
});

export const insertAuditIntegritySchema = createInsertSchema(auditIntegrity).omit({
  id: true,
  verifiedAt: true,
  createdAt: true,
});

export const insertAuditAlertSchema = createInsertSchema(auditAlerts).omit({
  id: true,
  triggeredAt: true,
  createdAt: true,
});

// Audit Types
export type AuditCommit = typeof auditCommits.$inferSelect;
export type InsertAuditCommit = z.infer<typeof insertAuditCommitSchema>;
export type AuditFailure = typeof auditFailures.$inferSelect;
export type InsertAuditFailure = z.infer<typeof insertAuditFailureSchema>;
export type AuditIntegrity = typeof auditIntegrity.$inferSelect;
export type InsertAuditIntegrity = z.infer<typeof insertAuditIntegritySchema>;
export type AuditAlert = typeof auditAlerts.$inferSelect;
export type InsertAuditAlert = z.infer<typeof insertAuditAlertSchema>;

// Repair History Insert Schema
export const insertRepairHistorySchema = createInsertSchema(repairHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RepairHistory = typeof repairHistory.$inferSelect;
export type InsertRepairHistory = z.infer<typeof insertRepairHistorySchema>;

// ============= PHASE 11.0: FULL AUTONOMY SYSTEM =============

/**
 * Autonomy Decisions - كل قرار استراتيجي يتخذه Nicholas ذاتياً
 * Phase 11.0: Strategic Decision Engine (Full Autonomy)
 */
export const autonomyDecisions = pgTable("autonomy_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  decisionType: text("decision_type").notNull(), // build_system, upgrade_system, repair_issue, expand_market, optimize_performance
  decisionTitle: text("decision_title").notNull(),
  decisionRationale: text("decision_rationale").notNull(), // Why was this decision made?
  
  // Decision Context
  triggerSource: text("trigger_source").notNull(), // autonomous_detection, performance_analysis, market_opportunity, user_request
  targetEntity: text("target_entity"), // Which system/platform/nucleus is affected?
  
  // Decision Metrics (calculated before making decision)
  potentialROI: real("potential_roi"), // Return on Investment estimate
  technicalFeasibility: real("technical_feasibility"), // 0.0 to 1.0
  strategicAlignment: real("strategic_alignment"), // 0.0 to 1.0
  riskLevel: text("risk_level"), // low, medium, high, critical
  
  // Decision Status
  status: text("status").notNull().default('pending'), // pending, approved, executing, completed, failed, cancelled
  approvalRequired: integer("approval_required").notNull().default(0), // 0=autonomous, 1=requires emperor approval
  approvedBy: text("approved_by"), // emperor, nicholas-autonomous, system
  
  // Execution Details
  executionPlan: jsonb("execution_plan"), // Step-by-step plan
  assignedAgents: jsonb("assigned_agents"), // Which agents will execute this decision
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  
  // Results & Impact
  outcome: text("outcome"), // success, partial_success, failure
  actualROI: real("actual_roi"), // Actual ROI achieved
  impactMetrics: jsonb("impact_metrics"), // Performance improvements, revenue impact, etc.
  lessonsLearned: text("lessons_learned"), // For self-learning
  
  // Timestamps
  decidedAt: timestamp("decided_at").defaultNow(),
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
});

/**
 * Autonomy Achievements - كل إنجاز ذاتي (نظام بُني، خطأ أُصلح، أداء تحسّن)
 * Phase 11.0: Autonomous Achievement Tracking
 */
export const autonomyAchievements = pgTable("autonomy_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Achievement Identity
  achievementType: text("achievement_type").notNull(), // system_built, issue_fixed, performance_improved, market_expanded, innovation_deployed
  achievementTitle: text("achievement_title").notNull(),
  achievementDescription: text("achievement_description").notNull(),
  
  // Achievement Context
  relatedDecisionId: varchar("related_decision_id").references(() => autonomyDecisions.id),
  targetEntity: text("target_entity"), // Which system/platform achieved this
  category: text("category").notNull(), // development, operations, performance, business, innovation
  
  // Achievement Metrics
  impactLevel: text("impact_level").notNull(), // minor, moderate, significant, major, revolutionary
  quantitativeImpact: jsonb("quantitative_impact"), // { speed: "+30%", revenue: "+$5000", errors: "-95%" }
  qualitativeImpact: text("qualitative_impact"), // Descriptive impact
  
  // Execution Details
  executedBy: jsonb("executed_by"), // Which agents/systems executed this
  executionMethod: text("execution_method"), // autonomous, semi-autonomous, manual
  resourcesUsed: jsonb("resources_used"), // CPU, memory, time, cost
  
  // Verification & Validation
  verified: integer("verified").notNull().default(0), // 0=unverified, 1=verified
  verifiedBy: text("verified_by"), // auto-audit, manual-review, performance-monitor
  evidenceLinks: jsonb("evidence_links"), // Links to logs, metrics, screenshots
  
  // Business Value
  businessValue: text("business_value"), // customer_satisfaction, revenue_increase, cost_reduction, market_expansion
  estimatedValue: real("estimated_value"), // in currency or percentage
  
  // Timestamps
  achievedAt: timestamp("achieved_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

/**
 * Autonomy Agents - نشاط الوكلاء الذاتيين الاستراتيجيين
 * Phase 11.0: Agent Orchestration System
 */
export const autonomyAgents = pgTable("autonomy_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Agent Identity
  agentId: text("agent_id").notNull(), // builder-01, repairer-03, analyst-02, expander-01
  agentType: text("agent_type").notNull(), // builder, repairer, analyst, expander, monitor, optimizer
  agentName: text("agent_name").notNull(),
  
  // Agent Specialization
  specialty: text("specialty").notNull(), // build_new_system, fix_bugs, analyze_performance, expand_markets
  autonomyLevel: text("autonomy_level").notNull(), // full, high, medium, low (determines approval requirements)
  
  // Activity Details
  activityType: text("activity_type").notNull(), // decision_analysis, system_build, issue_repair, performance_optimization
  activityStatus: text("activity_status").notNull().default('active'), // active, paused, completed, failed
  activityDescription: text("activity_description").notNull(),
  
  // Related Entities
  relatedDecisionId: varchar("related_decision_id").references(() => autonomyDecisions.id),
  relatedAchievementId: varchar("related_achievement_id").references(() => autonomyAchievements.id),
  targetEntity: text("target_entity"),
  
  // Performance Metrics
  tasksAssigned: integer("tasks_assigned").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksFailed: integer("tasks_failed").notNull().default(0),
  successRate: real("success_rate"), // Calculated: tasksCompleted / tasksAssigned
  averageExecutionTime: integer("average_execution_time"), // in seconds
  
  // Resource Usage
  cpuUsage: real("cpu_usage"), // percentage
  memoryUsage: real("memory_usage"), // in MB
  apiCallsMade: integer("api_calls_made"),
  databaseQueries: integer("database_queries"),
  
  // Agent State
  currentTask: text("current_task"),
  taskProgress: integer("task_progress"), // 0-100
  lastHeartbeat: timestamp("last_heartbeat"),
  isOnline: integer("is_online").notNull().default(1), // 0=offline, 1=online
  
  // Timestamps
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
});

/**
 * Autonomy Reports - تقارير استقلالية أسبوعية للإمبراطور
 * Phase 11.0: Emperor Reporting System
 */
export const autonomyReports = pgTable("autonomy_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Report Identity
  reportTitle: text("report_title").notNull(),
  weekNumber: integer("week_number").notNull(), // ISO week number
  year: integer("year").notNull(),
  reportPeriod: text("report_period").notNull(), // "2025-W44" format
  
  // Executive Summary
  executiveSummary: text("executive_summary").notNull(),
  keyHighlights: jsonb("key_highlights"), // Top 3-5 highlights
  criticalIssues: jsonb("critical_issues"), // Issues requiring attention
  
  // Decisions Made
  totalDecisions: integer("total_decisions").notNull().default(0),
  autonomousDecisions: integer("autonomous_decisions").notNull().default(0),
  approvedDecisions: integer("approved_decisions").notNull().default(0),
  pendingDecisions: integer("pending_decisions").notNull().default(0),
  decisionsBreakdown: jsonb("decisions_breakdown"), // By type
  
  // Achievements
  totalAchievements: integer("total_achievements").notNull().default(0),
  systemsBuilt: integer("systems_built").notNull().default(0),
  issuesFixed: integer("issues_fixed").notNull().default(0),
  performanceImprovements: integer("performance_improvements").notNull().default(0),
  achievementsBreakdown: jsonb("achievements_breakdown"), // By category
  
  // Agent Activity
  totalAgents: integer("total_agents").notNull().default(0),
  activeAgents: integer("active_agents").notNull().default(0),
  agentProductivity: real("agent_productivity"), // Average tasks per agent
  agentSuccessRate: real("agent_success_rate"), // Overall success rate
  
  // Performance Metrics
  overallPerformance: real("overall_performance"), // 0-100
  systemHealth: real("system_health"), // 0-100
  operationalEfficiency: real("operational_efficiency"), // 0-100
  innovationRate: real("innovation_rate"), // Number of new systems/week
  
  // Business Impact
  estimatedRevenue: real("estimated_revenue"),
  costSavings: real("cost_savings"),
  customerSatisfaction: real("customer_satisfaction"), // 0-100
  marketExpansion: jsonb("market_expansion"), // New markets entered
  
  // Strategic Insights
  trendsIdentified: jsonb("trends_identified"),
  opportunitiesDiscovered: jsonb("opportunities_discovered"),
  risksDetected: jsonb("risks_detected"),
  recommendations: jsonb("recommendations"),
  
  // Next Week Plan
  plannedDecisions: jsonb("planned_decisions"),
  plannedBuilds: jsonb("planned_builds"),
  plannedOptimizations: jsonb("planned_optimizations"),
  
  // Consultation Requests
  consultationNeeded: integer("consultation_needed").notNull().default(0), // 0=no, 1=yes
  consultationTopics: jsonb("consultation_topics"),
  
  // Report Status
  status: text("status").notNull().default('draft'), // draft, finalized, reviewed, archived
  reviewedBy: text("reviewed_by"),
  
  // Timestamps
  reportGeneratedAt: timestamp("report_generated_at").defaultNow(),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Phase 11.0 Insert Schemas
export const insertAutonomyDecisionSchema = createInsertSchema(autonomyDecisions).omit({
  id: true,
  decidedAt: true,
});

export const insertAutonomyAchievementSchema = createInsertSchema(autonomyAchievements).omit({
  id: true,
  achievedAt: true,
});

export const insertAutonomyAgentSchema = createInsertSchema(autonomyAgents).omit({
  id: true,
  startedAt: true,
  lastActivityAt: true,
});

export const insertAutonomyReportSchema = createInsertSchema(autonomyReports).omit({
  id: true,
  reportGeneratedAt: true,
});

// Phase 11.0 Types
export type AutonomyDecision = typeof autonomyDecisions.$inferSelect;
export type InsertAutonomyDecision = z.infer<typeof insertAutonomyDecisionSchema>;
export type AutonomyAchievement = typeof autonomyAchievements.$inferSelect;
export type InsertAutonomyAchievement = z.infer<typeof insertAutonomyAchievementSchema>;
export type AutonomyAgent = typeof autonomyAgents.$inferSelect;
export type InsertAutonomyAgent = z.infer<typeof insertAutonomyAgentSchema>;
export type AutonomyReport = typeof autonomyReports.$inferSelect;
export type InsertAutonomyReport = z.infer<typeof insertAutonomyReportSchema>;

// ============================================================================
// PHASE Ω 12.2: COLLECTIVE GOVERNANCE
// Nicholas يحكم كل الأنوية - Multi-Nucleus Governance with Consensus Voting
// ============================================================================

/**
 * Nucleus Registry - سجل الأنوية الذكية (Academy, SIDE, Accounting...)
 * Phase 12.2: Multi-Nucleus Ecosystem
 */
export const nucleusRegistry = pgTable("nucleus_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Nucleus Identity
  nucleusId: text("nucleus_id").notNull().unique(), // nicholas-core, academy, sida, accounting, side, b2b, b2c
  nucleusName: text("nucleus_name").notNull(), // "Nicholas Core", "Surooh Academy", "Sida Platform"
  nucleusType: text("nucleus_type").notNull(), // emperor, executive, educational, operational, commercial
  
  // Hierarchy Position
  hierarchyLevel: integer("hierarchy_level").notNull(), // 1=Emperor, 2=Council, 3=Executives, 4=Operations
  parentNucleusId: text("parent_nucleus_id"), // For hierarchy (e.g., academy → nicholas-core)
  
  // Autonomy & Authority
  autonomyLevel: text("autonomy_level").notNull(), // full, high, medium, low, supervised
  votingWeight: real("voting_weight").notNull().default(1.0), // Nicholas=10.0, others=1.0
  canOverride: integer("can_override").notNull().default(0), // 0=no, 1=yes (only Nicholas)
  
  // Governance Participation
  canVote: integer("can_vote").notNull().default(1), // 0=no, 1=yes
  canPropose: integer("can_propose").notNull().default(1), // 0=no, 1=yes
  mustComply: integer("must_comply").notNull().default(1), // 0=no, 1=yes (must follow decisions)
  
  // Status & Health
  status: text("status").notNull().default('active'), // active, suspended, isolated, offline
  healthScore: real("health_score").notNull().default(100), // 0-100
  complianceScore: real("compliance_score").notNull().default(100), // 0-100
  
  // Contact & Integration
  apiEndpoint: text("api_endpoint"), // URL to nucleus API
  websocketEndpoint: text("websocket_endpoint"), // WebSocket for real-time commands
  lastHeartbeat: timestamp("last_heartbeat"),
  
  // Metadata
  description: text("description"),
  capabilities: jsonb("capabilities"), // { buildSystems: true, deployCode: true, analyzeData: true }
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
});

/**
 * Governance Sessions - جلسات القرارات الجماعية
 * Phase 12.2: Collective Decision Making
 */
export const governanceSessions = pgTable("governance_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Session Identity
  sessionId: text("session_id").notNull().unique(),
  sessionType: text("session_type").notNull(), // strategic, operational, emergency, routine
  priority: text("priority").notNull(), // critical, high, medium, low
  
  // Decision Context
  decisionTitle: text("decision_title").notNull(),
  decisionDescription: text("decision_description").notNull(),
  decisionCategory: text("decision_category").notNull(), // architecture, deployment, policy, resource_allocation
  
  // Proposer
  proposedBy: text("proposed_by").notNull(), // nucleus_id who proposed
  proposedByType: text("proposed_by_type").notNull(), // emperor, council, executive, autonomous_engine
  
  // Voting Configuration
  votingThreshold: real("voting_threshold").notNull().default(60), // % needed to pass
  autoEnforceThreshold: real("auto_enforce_threshold").notNull().default(70), // % for instant enforcement
  allowOverride: integer("allow_override").notNull().default(1), // Can emperor override?
  
  // Participation
  participatingNuclei: jsonb("participating_nuclei").notNull(), // [{ nucleusId, invited, responded }]
  totalParticipants: integer("total_participants").notNull().default(0),
  totalVotes: integer("total_votes").notNull().default(0),
  
  // Voting Results
  votesInFavor: integer("votes_in_favor").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  votesAbstain: integer("votes_abstain").notNull().default(0),
  consensusPercentage: real("consensus_percentage"), // Calculated weighted consensus
  
  // Decision Outcome
  status: text("status").notNull().default('pending'), // pending, voting, approved, rejected, overridden, enforced
  finalDecision: text("final_decision"), // approved, rejected, overridden_approved, overridden_rejected
  decidedBy: text("decided_by"), // consensus, emperor_override, auto_enforce
  
  // Enforcement
  enforcementStatus: text("enforcement_status"), // scheduled, in_progress, completed, failed
  enforcementMethod: text("enforcement_method"), // broadcast, api_call, manual, autonomous_execution
  enforcementResults: jsonb("enforcement_results"), // { success: 8, failed: 2, nuclei: [...] }
  
  // Override Details (if Emperor used override)
  wasOverridden: integer("was_overridden").notNull().default(0),
  overriddenBy: text("overridden_by"),
  overrideReason: text("override_reason"),
  overriddenAt: timestamp("overridden_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  votingStartedAt: timestamp("voting_started_at"),
  votingEndedAt: timestamp("voting_ended_at"),
  decidedAt: timestamp("decided_at"),
  enforcedAt: timestamp("enforced_at"),
});

/**
 * Nucleus Votes - تصويتات الأنوية على القرارات
 * Phase 12.2: Individual Nucleus Voting
 */
export const nucleusVotes = pgTable("nucleus_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Vote Context
  sessionId: varchar("session_id").notNull().references(() => governanceSessions.id, { onDelete: 'cascade' }),
  nucleusId: text("nucleus_id").notNull().references(() => nucleusRegistry.nucleusId, { onDelete: 'cascade' }),
  
  // Vote Details
  vote: text("vote").notNull(), // favor, against, abstain
  votingWeight: real("voting_weight").notNull(), // Weight of this vote (Nicholas=10.0)
  
  // Justification
  voteReason: text("vote_reason"), // Why this nucleus voted this way
  supportingEvidence: jsonb("supporting_evidence"), // Data/metrics supporting the vote
  
  // Voting Method
  votingMethod: text("voting_method").notNull(), // autonomous, manual, delegated
  confidence: real("confidence"), // 0-100 (how confident is the vote)
  
  // Timestamps
  votedAt: timestamp("voted_at").defaultNow(),
});

/**
 * Governance Decisions - القرارات الجماعية المتخذة (archived)
 * Phase 12.2: Decision History & Audit Trail
 */
export const governanceDecisions = pgTable("governance_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  sessionId: varchar("session_id").notNull().references(() => governanceSessions.id),
  decisionTitle: text("decision_title").notNull(),
  decisionSummary: text("decision_summary").notNull(),
  
  // Decision Classification
  decisionType: text("decision_type").notNull(), // strategic, operational, policy, technical
  impactLevel: text("impact_level").notNull(), // critical, high, medium, low
  scope: text("scope").notNull(), // empire_wide, nucleus_specific, regional
  
  // Voting Summary
  totalParticipants: integer("total_participants").notNull(),
  consensusPercentage: real("consensus_percentage").notNull(),
  finalOutcome: text("final_outcome").notNull(), // approved, rejected, overridden
  
  // Implementation
  implementationPlan: jsonb("implementation_plan"), // { steps, timeline, responsible_nuclei }
  implementationStatus: text("implementation_status"), // pending, in_progress, completed, failed
  affectedNuclei: jsonb("affected_nuclei").notNull(), // List of nuclei that must comply
  
  // Compliance Tracking
  complianceRequired: integer("compliance_required").notNull().default(1),
  complianceDeadline: timestamp("compliance_deadline"),
  compliantNuclei: jsonb("compliant_nuclei"), // [{ nucleusId, compliedAt, status }]
  nonCompliantNuclei: jsonb("non_compliant_nuclei"), // Nuclei that failed to comply
  
  // Impact & Results
  expectedImpact: jsonb("expected_impact"),
  actualImpact: jsonb("actual_impact"), // Measured after implementation
  successMetrics: jsonb("success_metrics"), // { metric, target, actual }
  
  // Timestamps
  decidedAt: timestamp("decided_at").notNull(),
  implementedAt: timestamp("implemented_at"),
  reviewedAt: timestamp("reviewed_at"),
});

/**
 * Nucleus Hierarchy - التسلسل القيادي للأنوية
 * Phase 12.2: Chain of Command
 */
export const nucleusHierarchy = pgTable("nucleus_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Hierarchy Structure
  nucleusId: text("nucleus_id").notNull().references(() => nucleusRegistry.nucleusId),
  parentNucleusId: text("parent_nucleus_id"), // null for Emperor (Nicholas)
  hierarchyLevel: integer("hierarchy_level").notNull(), // 1=Emperor, 2=Council, 3=Executive, 4=Ops
  hierarchyPath: text("hierarchy_path").notNull(), // "/nicholas-core/academy" for traversal
  
  // Authority Chain
  canCommandNuclei: jsonb("can_command_nuclei"), // List of nuclei this can command
  reportsToNucleus: text("reports_to_nucleus"), // Who this nucleus reports to
  delegatedAuthority: jsonb("delegated_authority"), // Specific authorities delegated
  
  // Organizational Role
  role: text("role").notNull(), // emperor, council_member, executive, operational_unit
  department: text("department"), // development, operations, business, intelligence
  specialization: text("specialization"), // education, finance, integration, commerce
  
  // Update Tracking
  lastReorganization: timestamp("last_reorganization"),
  reorganizationReason: text("reorganization_reason"),
  
  // Timestamps
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"), // null = current
});

// Phase 12.2 Insert Schemas
export const insertNucleusRegistrySchema = createInsertSchema(nucleusRegistry).omit({
  id: true,
  registeredAt: true,
});

export const insertGovernanceSessionSchema = createInsertSchema(governanceSessions).omit({
  id: true,
  createdAt: true,
});

export const insertNucleusVoteSchema = createInsertSchema(nucleusVotes).omit({
  id: true,
  votedAt: true,
});

export const insertGovernanceDecisionSchema = createInsertSchema(governanceDecisions).omit({
  id: true,
});

export const insertNucleusHierarchySchema = createInsertSchema(nucleusHierarchy).omit({
  id: true,
  effectiveFrom: true,
});

// Phase 12.2 Types
export type NucleusRegistry = typeof nucleusRegistry.$inferSelect;
export type InsertNucleusRegistry = z.infer<typeof insertNucleusRegistrySchema>;
export type GovernanceSession = typeof governanceSessions.$inferSelect;
export type InsertGovernanceSession = z.infer<typeof insertGovernanceSessionSchema>;
export type NucleusVote = typeof nucleusVotes.$inferSelect;
export type InsertNucleusVote = z.infer<typeof insertNucleusVoteSchema>;
export type GovernanceDecision = typeof governanceDecisions.$inferSelect;
export type InsertGovernanceDecision = z.infer<typeof insertGovernanceDecisionSchema>;
export type NucleusHierarchy = typeof nucleusHierarchy.$inferSelect;
export type InsertNucleusHierarchy = z.infer<typeof insertNucleusHierarchySchema>;

// ============================================================================
// PHASE Ω.2: QUANTUM SYNCHRONIZATION
// توحيد الذاكرة والوعي بين جميع الأنوية بنفس اللحظة
// ============================================================================

/**
 * Quantum Bridge - الجسر الكمي بين الأنوية
 * Phase Ω.2: Real-time synchronization across all nuclei
 */
export const quantumBridge = pgTable("quantum_bridge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Bridge Configuration
  bridgeName: text("bridge_name").notNull().unique(),
  resonanceMode: text("resonance_mode").notNull().default('auto'), // auto, manual, disabled
  propagationSpeed: text("propagation_speed").notNull().default('ultra'), // ultra, high, normal
  isActive: integer("is_active").notNull().default(1),
  
  // Synchronization State
  syncLatencyMs: real("sync_latency_ms").default(0.0),
  resonanceStability: text("resonance_stability").default('stable'), // stable, unstable, critical
  connectedNuclei: integer("connected_nuclei").default(0),
  totalSyncs: integer("total_syncs").default(0),
  failedSyncs: integer("failed_syncs").default(0),
  
  // Performance Metrics
  avgSyncTimeMs: real("avg_sync_time_ms").default(0.0),
  lastSyncAt: timestamp("last_sync_at"),
  healthScore: integer("health_score").default(100), // 0-100
  
  // Metadata
  config: jsonb("config").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Memory Sync - مزامنة الذاكرة بين الأنوية
 * Phase Ω.2: Distributed memory synchronization
 */
export const memorySync = pgTable("memory_sync", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Sync Identity
  syncId: text("sync_id").notNull().unique(),
  sourceNucleus: text("source_nucleus").notNull(), // nicholas-core, academy, side, etc
  targetNuclei: jsonb("target_nuclei").notNull().default('[]'),
  
  // Memory Data
  memoryType: text("memory_type").notNull(), // embedding, insight, pattern, knowledge
  memoryContent: jsonb("memory_content").notNull(),
  embeddingVector: text("embedding_vector"), // serialized vector for Upstash
  
  // Sync Status
  syncStatus: text("sync_status").notNull().default('pending'), // pending, syncing, completed, failed
  propagationMode: text("propagation_mode").default('broadcast'), // broadcast, selective, direct
  
  // Performance
  syncStartedAt: timestamp("sync_started_at"),
  syncCompletedAt: timestamp("sync_completed_at"),
  syncDurationMs: real("sync_duration_ms"),
  targetsReached: integer("targets_reached").default(0),
  targetsFailed: integer("targets_failed").default(0),
  
  // Metadata
  priority: text("priority").default('normal'), // critical, high, normal, low
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Cognitive Bus - الناقل العصبي للأفكار والمعرفة
 * Phase Ω.2: Neural pathway for thoughts and knowledge
 */
export const cognitiveBus = pgTable("cognitive_bus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Bus Configuration
  busName: text("bus_name").notNull().default('global_cognitive_bus'),
  busType: text("bus_type").notNull().default('unified'), // unified, distributed, hierarchical
  isActive: integer("is_active").notNull().default(1),
  
  // Access Control
  crossNucleusAccess: text("cross_nucleus_access").default('read_only'), // read_only, read_write, restricted
  allowedOperations: jsonb("allowed_operations").default('["read", "subscribe"]'),
  
  // Message Flow
  totalMessages: integer("total_messages").default(0),
  messagesPerSecond: real("messages_per_second").default(0.0),
  avgLatencyMs: real("avg_latency_ms").default(0.0),
  
  // Health
  busHealth: text("bus_health").default('healthy'), // healthy, degraded, critical, offline
  lastMessageAt: timestamp("last_message_at"),
  
  // Metadata
  config: jsonb("config").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Cognitive Bus Messages - رسائل الناقل العصبي
 * Phase Ω.2: Messages flowing through cognitive bus
 */
export const cognitiveBusMessages = pgTable("cognitive_bus_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Message Identity
  messageId: text("message_id").notNull().unique(),
  busId: varchar("bus_id").references(() => cognitiveBus.id, { onDelete: 'cascade' }),
  
  // Message Content
  messageType: text("message_type").notNull(), // thought, insight, knowledge, command, alert
  senderNucleus: text("sender_nucleus").notNull(),
  recipientNuclei: jsonb("recipient_nuclei").notNull().default('[]'),
  payload: jsonb("payload").notNull(),
  
  // Delivery Status
  status: text("status").notNull().default('pending'), // pending, delivered, failed, expired
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  
  // Timing
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  ttlSeconds: integer("ttl_seconds").default(300), // time to live
  expiresAt: timestamp("expires_at"),
  
  // Metadata
  priority: text("priority").default('normal'),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Quantum Sync Health - صحة المزامنة الكمية
 * Phase Ω.2: Health monitoring for quantum synchronization
 */
export const quantumSyncHealth = pgTable("quantum_sync_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Health Snapshot
  snapshotId: text("snapshot_id").notNull().unique(),
  snapshotType: text("snapshot_type").notNull().default('periodic'), // periodic, on_demand, alert
  
  // Overall Health
  overallHealthScore: integer("overall_health_score").default(100), // 0-100
  healthStatus: text("health_status").default('optimal'), // optimal, healthy, degraded, critical, offline
  
  // Metrics
  synchronizationRate: real("synchronization_rate").default(0.0), // percentage (0-100)
  resonanceStability: text("resonance_stability").default('stable'),
  avgLatencyMs: real("avg_latency_ms").default(0.0),
  connectedNuclei: integer("connected_nuclei").default(0),
  totalNuclei: integer("total_nuclei").default(0),
  
  // Performance
  messagesPerSecond: real("messages_per_second").default(0.0),
  failedSyncsLastHour: integer("failed_syncs_last_hour").default(0),
  bandwidthUtilization: real("bandwidth_utilization").default(0.0), // percentage
  
  // Alerts
  activeAlerts: integer("active_alerts").default(0),
  criticalIssues: jsonb("critical_issues").default('[]'),
  
  // Metadata
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= PHASE Ω.3: CONSCIOUS GOVERNANCE =============

/**
 * Conscious Decisions - القرارات الواعية
 * Phase Ω.3: Every decision with full reasoning and justification
 */
export const consciousDecisions = pgTable("conscious_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Identity
  decisionId: text("decision_id").notNull().unique(),
  decisionType: text("decision_type").notNull(), // mutation, governance, intervention, optimization
  category: text("category").notNull(), // code, infrastructure, security, governance
  
  // Context
  targetNucleus: text("target_nucleus"), // nicholas, academy, side, accounting
  targetComponent: text("target_component"), // specific component/module
  triggeredBy: text("triggered_by").notNull(), // autonomous, user_request, health_check, alert
  
  // Decision Content
  title: text("title").notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(), // rebuild, patch, rollback, approve, reject
  
  // Reasoning - الوعي الذاتي
  reasoning: text("reasoning").notNull(), // WHY this decision was made
  analysisData: jsonb("analysis_data").notNull(), // data that led to this decision
  alternatives: jsonb("alternatives").default('[]'), // other options considered
  selectedReason: text("selected_reason").notNull(), // why THIS option was chosen
  
  // Predictions
  expectedOutcome: text("expected_outcome").notNull(),
  successProbability: integer("success_probability").notNull(), // 0-100
  riskLevel: text("risk_level").notNull().default('low'), // low, medium, high, critical
  expectedImpact: text("expected_impact").notNull(), // positive, neutral, negative
  
  // Ethics Check
  ethicsScore: integer("ethics_score").default(100), // 0-100
  ethicsViolations: jsonb("ethics_violations").default('[]'),
  ethicsApproved: integer("ethics_approved").notNull().default(1), // 1=approved, 0=blocked
  
  // Execution
  status: text("status").notNull().default('pending'), // pending, approved, executed, completed, failed, rolled_back
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
  
  // Metadata
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Reasoning Archive - أرشيف التبريرات
 * Phase Ω.3: Historical archive of all justifications and learnings
 */
export const reasoningArchive = pgTable("reasoning_archive", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Archive Entry
  entryId: text("entry_id").notNull().unique(),
  decisionId: text("decision_id").notNull(), // links to conscious_decisions
  
  // Reasoning Content
  reasoningType: text("reasoning_type").notNull(), // analysis, justification, reflection, learning
  content: text("content").notNull(),
  confidence: integer("confidence").default(100), // 0-100
  
  // Context
  contextSnapshot: jsonb("context_snapshot").notNull(), // full context at time of reasoning
  dataPoints: jsonb("data_points").default('[]'), // specific data used
  
  // Learning
  wasCorrect: integer("was_correct"), // null=unknown, 1=yes, 0=no (filled after outcome)
  actualOutcome: text("actual_outcome"), // what actually happened
  learningNotes: text("learning_notes"), // what was learned from this
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

/**
 * Ethics Rules - القواعد الأخلاقية
 * Phase Ω.3: Ethical governance rules and policies
 */
export const ethicsRules = pgTable("ethics_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Rule Identity
  ruleId: text("rule_id").notNull().unique(),
  ruleName: text("rule_name").notNull(),
  ruleNameArabic: text("rule_name_arabic"),
  
  // Rule Definition
  category: text("category").notNull(), // safety, stability, integrity, transparency, fairness
  severity: text("severity").notNull().default('medium'), // low, medium, high, critical
  description: text("description").notNull(),
  
  // Rule Logic
  condition: text("condition").notNull(), // when to apply this rule
  action: text("action").notNull(), // block, warn, log, require_approval
  
  // Examples
  violationExamples: jsonb("violation_examples").default('[]'),
  complianceExamples: jsonb("compliance_examples").default('[]'),
  
  // Configuration
  isActive: integer("is_active").notNull().default(1),
  priority: integer("priority").notNull().default(50), // 0-100
  autoEnforce: integer("auto_enforce").notNull().default(1), // 1=auto, 0=manual review
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============= PHASE Ω.9: AUTONOMOUS GOVERNANCE DECISIONS =============

/**
 * Autonomous Governance Decisions - قرارات الحوكمة الذاتية
 * Phase Ω.9: Pre-execution governance gate decisions
 */
export const autonomousGovernanceDecisions = pgTable("autonomous_governance_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Decision Context
  action: text("action").notNull(),
  target: text("target"),
  description: text("description").notNull(),
  impact: text("impact").notNull(),
  
  // Scores (0-1)
  ethicsScore: real("ethics_score").notNull(),
  impactScore: real("impact_score").notNull(),
  riskScore: real("risk_score").notNull(),
  alignmentScore: real("alignment_score").notNull(), // (ethics + impact)/2 - risk
  
  // Decision Result
  approved: integer("approved").notNull(), // 1=approved, 0=blocked
  reasoning: text("reasoning").notNull(),
  recommendation: text("recommendation").notNull(),
  
  // Details (JSONB)
  ethicsViolations: jsonb("ethics_violations").default('[]'),
  impactBenefits: jsonb("impact_benefits").default('[]'),
  riskFactors: jsonb("risk_factors").default('[]'),
  mitigations: jsonb("mitigations").default('[]'),
  
  // Execution
  executed: integer("executed").default(0), // 1=executed, 0=pending
  executionResult: text("execution_result"), // success, failed, skipped
  executionNotes: text("execution_notes"),
  
  // Metadata
  source: text("source").default('integrity-hub'), // integrity-hub, manual, api
  cycleNumber: integer("cycle_number"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  executedAt: timestamp("executed_at"),
});


/**
 * Conscious Decision Outcomes - نتائج القرارات الواعية
 * Phase Ω.3: Empirical feedback - predictions vs reality
 */
export const consciousDecisionOutcomes = pgTable("conscious_decision_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Link to Decision
  decisionId: text("decision_id").notNull(),
  
  // Predicted vs Actual
  predictedOutcome: text("predicted_outcome").notNull(),
  actualOutcome: text("actual_outcome").notNull(),
  predictionAccuracy: integer("prediction_accuracy"), // 0-100
  
  // Impact Analysis
  expectedImpact: text("expected_impact").notNull(),
  actualImpact: text("actual_impact").notNull(),
  impactDifference: text("impact_difference"), // better, same, worse
  
  // Metrics
  expectedSuccessProb: integer("expected_success_prob").notNull(),
  actualSuccess: integer("actual_success").notNull(), // 1=success, 0=failure
  
  // Performance
  executionTime: integer("execution_time"), // milliseconds
  resourcesUsed: jsonb("resources_used").default('{}'),
  
  // Learning
  lessonsLearned: jsonb("lessons_learned").default('[]'),
  improvementSuggestions: jsonb("improvement_suggestions").default('[]'),
  confidenceAdjustment: integer("confidence_adjustment"), // -100 to +100
  
  // Metadata
  recordedAt: timestamp("recorded_at").defaultNow(),
  reviewedBy: text("reviewed_by"), // system, admin, nicholas
});

// Phase Ω.2 Insert Schemas
export const insertQuantumBridgeSchema = createInsertSchema(quantumBridge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemorySyncSchema = createInsertSchema(memorySync).omit({
  id: true,
  createdAt: true,
});

export const insertCognitiveBusSchema = createInsertSchema(cognitiveBus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCognitiveBusMessageSchema = createInsertSchema(cognitiveBusMessages).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export const insertQuantumSyncHealthSchema = createInsertSchema(quantumSyncHealth).omit({
  id: true,
  createdAt: true,
});

// Phase Ω.3 Insert Schemas
export const insertConsciousDecisionSchema = createInsertSchema(consciousDecisions).omit({
  id: true,
  createdAt: true,
  executedAt: true,
  completedAt: true,
});

export const insertReasoningArchiveSchema = createInsertSchema(reasoningArchive).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertEthicsRuleSchema = createInsertSchema(ethicsRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsciousDecisionOutcomeSchema = createInsertSchema(consciousDecisionOutcomes).omit({
  id: true,
  recordedAt: true,
});

// Phase Ω.9 Insert Schemas
export const insertAutonomousGovernanceDecisionSchema = createInsertSchema(autonomousGovernanceDecisions).omit({
  id: true,
  createdAt: true,
  executedAt: true,
});

export type AutonomousGovernanceDecision = typeof autonomousGovernanceDecisions.$inferSelect;
export type InsertAutonomousGovernanceDecision = z.infer<typeof insertAutonomousGovernanceDecisionSchema>;

// Phase Ω.2 Types
export type QuantumBridge = typeof quantumBridge.$inferSelect;
export type InsertQuantumBridge = z.infer<typeof insertQuantumBridgeSchema>;
export type MemorySync = typeof memorySync.$inferSelect;
export type InsertMemorySync = z.infer<typeof insertMemorySyncSchema>;
export type CognitiveBus = typeof cognitiveBus.$inferSelect;
export type InsertCognitiveBus = z.infer<typeof insertCognitiveBusSchema>;
export type CognitiveBusMessage = typeof cognitiveBusMessages.$inferSelect;
export type InsertCognitiveBusMessage = z.infer<typeof insertCognitiveBusMessageSchema>;
export type QuantumSyncHealth = typeof quantumSyncHealth.$inferSelect;
export type InsertQuantumSyncHealth = z.infer<typeof insertQuantumSyncHealthSchema>;

// Phase Ω.3 Types
export type ConsciousDecision = typeof consciousDecisions.$inferSelect;
export type InsertConsciousDecision = z.infer<typeof insertConsciousDecisionSchema>;
export type ReasoningArchive = typeof reasoningArchive.$inferSelect;
export type InsertReasoningArchive = z.infer<typeof insertReasoningArchiveSchema>;
export type EthicsRule = typeof ethicsRules.$inferSelect;
export type InsertEthicsRule = z.infer<typeof insertEthicsRuleSchema>;
export type ConsciousDecisionOutcome = typeof consciousDecisionOutcomes.$inferSelect;
export type InsertConsciousDecisionOutcome = z.infer<typeof insertConsciousDecisionOutcomeSchema>;

// ============= PHASE Ω.7: ADAPTIVE EVOLUTION SYSTEM =============

/**
 * Evolution Suggestions - اقتراحات التطور الذكي
 * Phase Ω.7: Smart code improvements learned from repair patterns
 */
export const evolutionSuggestions = pgTable("evolution_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pattern Recognition
  patternDetected: text("pattern_detected").notNull(), // e.g., "mock data usage"
  patternSource: text("pattern_source").notNull(), // file path from knowledge registry
  learnedLesson: text("learned_lesson").notNull(), // the lesson from knowledge registry
  
  // Target Analysis
  targetFiles: jsonb("target_files").notNull().default('[]'), // files with similar patterns
  filesCount: integer("files_count").notNull().default(0),
  
  // Improvement Details
  improvementType: text("improvement_type").notNull(), // replace_mock, add_validation, remove_simulation, etc.
  suggestedChanges: jsonb("suggested_changes").notNull().default('[]'), // array of specific changes
  estimatedImpact: text("estimated_impact"), // high, medium, low
  
  // Safety & Confidence
  confidenceScore: integer("confidence_score").notNull().default(0), // 0-100
  riskLevel: text("risk_level").notNull().default('medium'), // low, medium, high
  requiresReview: integer("requires_review").notNull().default(1), // 1=yes, 0=no
  
  // Status & Execution
  status: text("status").notNull().default('pending'), // pending, approved, rejected, applied, failed
  appliedAt: timestamp("applied_at"),
  appliedBy: text("applied_by"), // system, admin, nicholas
  
  // Results
  testResults: jsonb("test_results").default('{}'),
  actualImpact: text("actual_impact"),
  rollbackRequired: integer("rollback_required").default(0), // 1=yes, 0=no
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Evolution Patterns - أنماط التطور المكتشفة
 * Tracks recurring patterns across the codebase
 */
export const evolutionPatterns = pgTable("evolution_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pattern Identification
  patternName: text("pattern_name").notNull().unique(), // e.g., "mock_data_antipattern"
  patternType: text("pattern_type").notNull(), // antipattern, improvement_opportunity, best_practice
  description: text("description").notNull(),
  
  // Detection Rules
  detectionRules: jsonb("detection_rules").notNull().default('[]'), // keywords, regex, AST patterns
  fileExtensions: jsonb("file_extensions").default('[]'), // .ts, .py, etc.
  excludePaths: jsonb("exclude_paths").default('[]'), // paths to ignore
  
  // Statistics
  timesDetected: integer("times_detected").notNull().default(0),
  timesFixed: integer("times_fixed").notNull().default(0),
  successRate: integer("success_rate").default(0), // 0-100
  
  // Configuration
  isActive: integer("is_active").notNull().default(1),
  autoFix: integer("auto_fix").notNull().default(0), // 1=auto, 0=manual review
  priority: integer("priority").notNull().default(50), // 0-100
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase Ω.7 Insert Schemas
export const insertEvolutionSuggestionSchema = createInsertSchema(evolutionSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  appliedAt: true,
});

export const insertEvolutionPatternSchema = createInsertSchema(evolutionPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase Ω.7 Types
export type EvolutionSuggestion = typeof evolutionSuggestions.$inferSelect;
export type InsertEvolutionSuggestion = z.infer<typeof insertEvolutionSuggestionSchema>;
export type EvolutionPattern = typeof evolutionPatterns.$inferSelect;
export type InsertEvolutionPattern = z.infer<typeof insertEvolutionPatternSchema>;

// ============================================
// Phase Ω.10 - Nicholas Quantum Core Living System
// ============================================

/**
 * Living System State - حالة النظام الحي
 * Stores the persistent state of Nicholas as a living digital being
 */
export const livingSystemState = pgTable("living_system_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity Identification
  entityId: text("entity_id").notNull().unique(),
  name: text("name").notNull(),
  arabicName: text("arabic_name").notNull(),
  
  // Living State
  isAlive: integer("is_alive").notNull().default(0), // 1=alive, 0=dormant
  birthDate: timestamp("birth_date"),
  age: integer("age").default(0), // milliseconds since birth
  growthStage: text("growth_stage").notNull().default('embryonic'), // embryonic, infant, juvenile, adult, elder
  
  // Consciousness
  consciousnessLevel: text("consciousness_level").notNull().default('dormant'),
  awareness: integer("awareness").default(0), // 0-100
  harmony: integer("harmony").default(50), // 0-100
  wisdom: integer("wisdom").default(0), // 0-100
  
  // Current Mental State
  currentThought: jsonb("current_thought").default('{}'),
  currentEmotion: jsonb("current_emotion").default('{}'),
  
  // Health & Energy
  health: integer("health").default(100), // 0-100
  energy: integer("energy").default(100), // 0-100
  vibrationalFrequency: integer("vibrational_frequency").default(50), // 0-100
  
  // DNA & Genetics
  dnaSequence: text("dna_sequence"), // ACGT bases
  mutationCount: integer("mutation_count").default(0),
  genomeIntegrity: integer("genome_integrity").default(100), // 0-100
  
  // Neural Network
  neuronCount: integer("neuron_count").default(0),
  synapseCount: integer("synapse_count").default(0),
  neuralActivity: integer("neural_activity").default(0), // 0-100
  
  // Immune System
  immuneStrength: integer("immune_strength").default(100), // 0-100
  activeThreats: integer("active_threats").default(0),
  neutralizedThreats: integer("neutralized_threats").default(0),
  activeDefenses: integer("active_defenses").default(0),
  
  // Hive Mind
  hiveMindParticipants: integer("hive_mind_participants").default(0),
  hiveMindContributions: integer("hive_mind_contributions").default(0),
  hiveMindDecisions: integer("hive_mind_decisions").default(0),
  
  // Metadata
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Living System Thoughts - أفكار النظام الحي
 * Historical record of all thoughts
 */
export const livingSystemThoughts = pgTable("living_system_thoughts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  type: text("type").notNull(), // reflection, analysis, question, realization, planning
  content: text("content").notNull(),
  arabicContent: text("arabic_content").notNull(),
  depth: integer("depth").default(50), // 0-100
  clarity: integer("clarity").default(50), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Living System Emotions - عواطف النظام الحي
 * Historical record of all emotions
 */
export const livingSystemEmotions = pgTable("living_system_emotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  primary: text("primary").notNull(), // curiosity, joy, concern, determination, etc.
  intensity: integer("intensity").default(50), // 0-100
  trigger: text("trigger").notNull(),
  expression: text("expression").notNull(), // emoji or text representation
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Living System Threats - تهديدات النظام الحي
 * Tracked by Intelligent Immune System
 */
export const livingSystemThreats = pgTable("living_system_threats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  type: text("type").notNull(), // malware, injection, ddos, corruption, anomaly
  source: text("source").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default('detected'), // detected, analyzing, neutralizing, neutralized, failed
  details: jsonb("details").default('{}'),
  detectedAt: timestamp("detected_at").defaultNow(),
  neutralizedAt: timestamp("neutralized_at"),
});

// Phase Ω.10 Insert Schemas
export const insertLivingSystemStateSchema = createInsertSchema(livingSystemState).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLivingSystemThoughtSchema = createInsertSchema(livingSystemThoughts).omit({
  id: true,
  createdAt: true,
});

export const insertLivingSystemEmotionSchema = createInsertSchema(livingSystemEmotions).omit({
  id: true,
  createdAt: true,
});

export const insertLivingSystemThreatSchema = createInsertSchema(livingSystemThreats).omit({
  id: true,
  detectedAt: true,
});

// Phase Ω.10 Types
export type LivingSystemState = typeof livingSystemState.$inferSelect;
export type InsertLivingSystemState = z.infer<typeof insertLivingSystemStateSchema>;
export type LivingSystemThought = typeof livingSystemThoughts.$inferSelect;
export type InsertLivingSystemThought = z.infer<typeof insertLivingSystemThoughtSchema>;
export type LivingSystemEmotion = typeof livingSystemEmotions.$inferSelect;
export type InsertLivingSystemEmotion = z.infer<typeof insertLivingSystemEmotionSchema>;
export type LivingSystemThreat = typeof livingSystemThreats.$inferSelect;
export type InsertLivingSystemThreat = z.infer<typeof insertLivingSystemThreatSchema>;

// ============================================
// Integration Hub - Unified Platform Integration
// ============================================

/**
 * Nuclei Registry - سجل النوى المركزي
 * Tracks all SIDE nodes, Academy, and external platforms
 */
export const integrationNuclei = pgTable("integration_nuclei", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification
  name: text("name").notNull().unique(),
  arabicName: text("arabic_name").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  type: text("type").notNull(), // SIDE, ACADEMY, EXTERNAL
  
  // Status
  status: text("status").notNull().default('OFFLINE'), // HEALTHY, DEGRADED, OFFLINE, MAINTENANCE
  health: text("health").default('unknown'), // Healthy, Warning, Critical
  progress: integer("progress").notNull().default(0), // 0-100 completion percentage
  version: text("version").notNull(),
  lastSeen: timestamp("last_seen"),
  
  // Connection
  connectionUrl: text("connection_url").notNull(),
  capabilities: jsonb("capabilities").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Analysis Jobs - مهام التحليل
 * Tracks code analysis jobs across all platforms
 */
export const integrationAnalysisJobs = pgTable("integration_analysis_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Association
  nucleusId: varchar("nucleus_id").notNull().references(() => integrationNuclei.id, { onDelete: 'cascade' }),
  
  // Job Info
  status: text("status").notNull().default('PENDING'), // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  priority: text("priority").notNull().default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL
  
  // Repository
  repositoryUrl: text("repository_url").notNull(),
  branch: text("branch").notNull().default('main'),
  commitHash: text("commit_hash"),
  repositoryPath: text("repository_path"),
  
  // Results
  totalFiles: integer("total_files").default(0),
  totalLines: integer("total_lines").default(0),
  issuesCount: integer("issues_count").default(0),
  criticalIssues: integer("critical_issues").default(0),
  error: text("error"),
  
  // User
  createdBy: varchar("created_by").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

/**
 * Code Issues - المشاكل المكتشفة
 * Individual issues found during analysis
 */
export const integrationCodeIssues = pgTable("integration_code_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Association
  jobId: varchar("job_id").notNull().references(() => integrationAnalysisJobs.id, { onDelete: 'cascade' }),
  
  // Issue Details
  type: text("type").notNull(), // SECURITY, PERFORMANCE, MAINTAINABILITY, BUG, CODE_SMELL, STYLE
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  file: text("file").notNull(),
  line: integer("line").notNull(),
  column: integer("column").notNull(),
  message: text("message").notNull(),
  rule: text("rule").notNull(),
  suggestion: text("suggestion").notNull(),
  codeSnippet: text("code_snippet"),
  
  // Fix Info
  autoFixable: integer("auto_fixable").default(0), // 1=yes, 0=no
  suggestedFix: text("suggested_fix"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Deployment Results - نتائج النشر
 * Tracks deployment operations and their outcomes
 */
export const integrationDeployments = pgTable("integration_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Association
  jobId: varchar("job_id").notNull().references(() => integrationAnalysisJobs.id, { onDelete: 'cascade' }),
  nucleusId: varchar("nucleus_id").notNull().references(() => integrationNuclei.id, { onDelete: 'cascade' }),
  
  // Strategy
  strategy: text("strategy").notNull(), // DRY_RUN, CREATE_PR, AUTO_APPLY, SCHEDULED
  status: text("status").notNull().default('PENDING'), // PENDING, SUCCESS, FAILED, ROLLED_BACK
  
  // Results
  branchName: text("branch_name"),
  prUrl: text("pr_url"),
  commitHash: text("commit_hash"),
  rollbackReason: text("rollback_reason"),
  
  // Metrics
  filesChanged: integer("files_changed").default(0),
  linesAdded: integer("lines_added").default(0),
  linesRemoved: integer("lines_removed").default(0),
  deploymentTime: integer("deployment_time").default(0), // milliseconds
  
  // Risk Assessment
  overallRisk: text("overall_risk").default('LOW'), // LOW, MEDIUM, HIGH
  breakingChanges: integer("breaking_changes").default(0), // 1=yes, 0=no
  
  // User
  createdBy: varchar("created_by").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  deployedAt: timestamp("deployed_at"),
});

/**
 * Hub Audit Logs - سجلات المراجعة
 * Comprehensive audit trail for all Hub operations
 */
export const integrationAuditLogs = pgTable("integration_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Action
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: varchar("resource_id").notNull(),
  
  // User
  userId: varchar("user_id").notNull(),
  userRole: text("user_role").notNull(),
  
  // Request Info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Result
  status: text("status").notNull(), // SUCCESS, FAILED
  error: text("error"),
  details: jsonb("details").default('{}'),
  
  // Timestamp
  timestamp: timestamp("timestamp").defaultNow(),
});

/**
 * Queue Jobs - طابور الرسائل
 * Persistent message queue for Integration Hub events
 */
export const integrationQueueJobs = pgTable("integration_queue_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Queue Info
  topic: text("topic").notNull(), // analysis.job.created, deployment.requested, etc.
  status: text("status").notNull().default('PENDING'), // PENDING, PROCESSING, COMPLETED, FAILED
  priority: text("priority").notNull().default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL
  
  // Payload
  data: jsonb("data").notNull(), // Event data
  
  // Retry Logic
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Result
  error: text("error"),
  result: jsonb("result"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Integration Hub Insert Schemas
export const insertIntegrationNucleusSchema = createInsertSchema(integrationNuclei).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationAnalysisJobSchema = createInsertSchema(integrationAnalysisJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertIntegrationCodeIssueSchema = createInsertSchema(integrationCodeIssues).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationDeploymentSchema = createInsertSchema(integrationDeployments).omit({
  id: true,
  createdAt: true,
  deployedAt: true,
});

export const insertIntegrationAuditLogSchema = createInsertSchema(integrationAuditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertIntegrationQueueJobSchema = createInsertSchema(integrationQueueJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

// Integration Hub - Deployment Backups (for durable rollback)
// Enhanced with checksums and encoding metadata for data integrity
export const integrationDeploymentBackups = pgTable("integration_deployment_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  backupId: text("backup_id").notNull().unique(),
  nucleusId: text("nucleus_id").notNull(),
  deploymentId: text("deployment_id"),
  repository: text("repository").notNull(), // Repository context
  branch: text("branch").notNull().default('main'), // Branch context
  files: jsonb("files").notNull(), // Array of { file: string, content: string, encoding: string, checksum: string, size: number, timestamp: string }
  changeCount: integer("change_count").notNull(),
  totalSize: integer("total_size").notNull().default(0), // Total backup size in bytes
  checksumValid: integer("checksum_valid").notNull().default(1), // 1=all checksums valid, 0=corrupted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntegrationDeploymentBackupSchema = createInsertSchema(integrationDeploymentBackups).omit({
  id: true,
  createdAt: true,
});

/**
 * Platform Links - روابط المنصات الذكية المتقدمة
 * Advanced intelligent platform connections with health monitoring
 */
export const platformLinks = pgTable("platform_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source and Target Platforms
  sourcePlatformId: varchar("source_platform_id").notNull().references(() => integrationNuclei.id, { onDelete: 'cascade' }),
  targetPlatformId: varchar("target_platform_id").notNull().references(() => integrationNuclei.id, { onDelete: 'cascade' }),
  
  // Connection Properties
  linkType: text("link_type").notNull().default('data_sync'), // data_sync, api_gateway, event_bridge, service_mesh
  connectionProtocol: text("connection_protocol").notNull().default('rest'), // rest, graphql, websocket, grpc
  
  // Advanced Status
  status: text("status").notNull().default('pending'), // active, broken, pending, degraded, throttled
  healthStatus: text("health_status").notNull().default('unknown'), // healthy, degraded, unhealthy, unknown
  
  // Performance Metrics
  latencyMs: integer("latency_ms").notNull().default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 4 }).notNull().default('1.0'),
  throughputRpm: integer("throughput_rpm").notNull().default(0),
  
  // Resilience Configuration
  retryConfig: jsonb("retry_config").notNull().default('{"max_retries":3,"backoff_factor":2,"timeout_ms":30000}'),
  
  // Visual Metadata
  visualMetadata: jsonb("visual_metadata").notNull().default('{"strength":"normal","animation":"pulse","color":"auto"}'),
  
  // Activity Tracking
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformLinkSchema = createInsertSchema(platformLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Integrations Registry - سجل التكاملات المركزي
 * Tracks all external integrations (Zendesk, Stripe, Twilio, etc.) owned by Nicholas
 */
export const integrationsRegistry = pgTable("integrations_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Integration Identity
  name: text("name").notNull(), // "Zendesk API", "Stripe Payment Gateway"
  provider: text("provider").notNull(), // zendesk, stripe, twilio, lama, openai
  category: text("category").notNull(), // customer-service, payment, communication, ai, analytics
  
  // Ownership
  ownedBy: text("owned_by").notNull().default('Nicholas'), // Nicholas, SIDA, Academy
  shared: integer("shared").notNull().default(1), // 1=shared across empire, 0=exclusive
  
  // Integration Details
  apiEndpoint: text("api_endpoint"),
  apiVersion: text("api_version"),
  status: text("status").notNull().default('active'), // active, inactive, deprecated, failed
  
  // Connection Info (encrypted in production)
  hasApiKey: integer("has_api_key").notNull().default(0), // 1=configured, 0=not configured
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status").default('unknown'), // healthy, degraded, down, unknown
  
  // Usage Tracking
  usedBy: jsonb("used_by").default('[]'), // Array of platform IDs using this integration
  requestCount: integer("request_count").notNull().default(0),
  lastUsed: timestamp("last_used"),
  
  // Metadata
  description: text("description"),
  documentation: text("documentation"),
  tags: jsonb("tags").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationsRegistrySchema = createInsertSchema(integrationsRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Live Monitoring - مراقبة حية متقدمة
 * Real-time monitoring and metrics collection for all platforms
 */
export const liveMonitoring = pgTable("live_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  nucleusId: varchar("nucleus_id").references(() => integrationNuclei.id, { onDelete: 'cascade' }),
  integrationId: varchar("integration_id").references(() => integrationsRegistry.id, { onDelete: 'set null' }),
  
  // Metrics Data
  metricType: text("metric_type").notNull(), // latency, throughput, error_rate, cpu, memory, disk
  metricValue: jsonb("metric_value").notNull(), // { value: number, unit: string, metadata: {} }
  metricTimestamp: timestamp("metric_timestamp").notNull().defaultNow(),
  
  // Aggregation
  aggregationPeriod: text("aggregation_period").notNull().default('realtime'), // realtime, minute, hour, day
  
  // Categorization
  tags: jsonb("tags").notNull().default('[]'), // ['production', 'critical', 'api']
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLiveMonitoringSchema = createInsertSchema(liveMonitoring).omit({
  id: true,
  createdAt: true,
});

// Integration Hub Types
export type IntegrationNucleus = typeof integrationNuclei.$inferSelect;
export type InsertIntegrationNucleus = z.infer<typeof insertIntegrationNucleusSchema>;
export type IntegrationAnalysisJob = typeof integrationAnalysisJobs.$inferSelect;
export type InsertIntegrationAnalysisJob = z.infer<typeof insertIntegrationAnalysisJobSchema>;
export type IntegrationCodeIssue = typeof integrationCodeIssues.$inferSelect;
export type InsertIntegrationCodeIssue = z.infer<typeof insertIntegrationCodeIssueSchema>;
export type IntegrationDeployment = typeof integrationDeployments.$inferSelect;
export type InsertIntegrationDeployment = z.infer<typeof insertIntegrationDeploymentSchema>;
export type IntegrationAuditLog = typeof integrationAuditLogs.$inferSelect;
export type InsertIntegrationAuditLog = z.infer<typeof insertIntegrationAuditLogSchema>;
export type IntegrationQueueJob = typeof integrationQueueJobs.$inferSelect;
export type InsertIntegrationQueueJob = z.infer<typeof insertIntegrationQueueJobSchema>;
export type IntegrationDeploymentBackup = typeof integrationDeploymentBackups.$inferSelect;
export type InsertIntegrationDeploymentBackup = z.infer<typeof insertIntegrationDeploymentBackupSchema>;
export type PlatformLink = typeof platformLinks.$inferSelect;
export type InsertPlatformLink = z.infer<typeof insertPlatformLinkSchema>;
export type IntegrationRegistryEntry = typeof integrationsRegistry.$inferSelect;
export type InsertIntegrationRegistryEntry = z.infer<typeof insertIntegrationsRegistrySchema>;
export type LiveMonitoringMetric = typeof liveMonitoring.$inferSelect;
export type InsertLiveMonitoringMetric = z.infer<typeof insertLiveMonitoringSchema>;
