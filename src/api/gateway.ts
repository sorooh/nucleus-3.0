/**
 * 🌐 Professional API Gateway - Enterprise API Management
 * 
 * Advanced API gateway with routing, authentication, rate limiting,
 * load balancing, and comprehensive monitoring
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { Logger } from '../core/monitoring/logger';
import { SecurityManager } from '../core/security/security-manager';
import { PerformanceMonitor } from '../core/monitoring/performance-monitor';
import { CircuitBreaker } from '../core/monitoring/circuit-breaker';

// API Gateway Interfaces
export interface APIRoute {
  id: string;
  path: string;
  method: string;
  handler: APIHandler;
  middleware: APIMiddleware[];
  rateLimit?: RateLimitConfig;
  authentication: boolean;
  authorization?: string[];
  circuitBreaker?: CircuitBreaker;
  metadata: Record<string, any>;
}

export interface APIHandler {
  (request: APIRequest, response: APIResponse): Promise<void>;
}

export interface APIMiddleware {
  (request: APIRequest, response: APIResponse, next: () => Promise<void>): Promise<void>;
}

export interface APIRequest {
  id: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  params: Record<string, string>;
  user?: any;
  session?: any;
  timestamp: number;
  ip: string;
  userAgent: string;
}

export interface APIResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  sent: boolean;
  timestamp: number;
  
  // Helper methods
  json(data: any): void;
  text(data: string): void;
  error(message: string, status?: number): void;
  success(data?: any, message?: string): void;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: APIRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheck: {
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
}

export interface APIGatewayConfig {
  port: number;
  host: string;
  enableCors: boolean;
  corsOrigins: string[];
  enableCompression: boolean;
  requestTimeout: number;
  bodyParserLimit: string;
  enableMetrics: boolean;
  enableOpenAPI: boolean;
  loadBalancer?: LoadBalancerConfig;
}

/**
 * Professional API Gateway with Enterprise Features
 */
export class APIGateway extends EventEmitter {
  private logger: Logger;
  private security: SecurityManager;
  private monitor: PerformanceMonitor;
  
  // Server and routing
  private server: any;
  private routes: Map<string, APIRoute>;
  private middlewares: APIMiddleware[];
  
  // Rate limiting
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  
  // Load balancing
  private serviceInstances: Map<string, any[]>;
  private loadBalancerCounters: Map<string, number>;
  
  // Configuration
  private config: APIGatewayConfig;
  
  private readonly DEFAULT_CONFIG: APIGatewayConfig = {
    port: 3000,
    host: '0.0.0.0',
    enableCors: true,
    corsOrigins: ['*'],
    enableCompression: true,
    requestTimeout: 30000,
    bodyParserLimit: '10mb',
    enableMetrics: true,
    enableOpenAPI: true
  };

  constructor(config?: Partial<APIGatewayConfig>) {
    super();
    this.logger = new Logger('APIGateway');
    this.security = new SecurityManager();
    this.monitor = new PerformanceMonitor();
    
    this.routes = new Map();
    this.middlewares = [];
    this.rateLimitStore = new Map();
    this.serviceInstances = new Map();
    this.loadBalancerCounters = new Map();
    
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    
    this.setupDefaultMiddlewares();
    this.startRateLimitCleanup();
    
    this.logger.info('API Gateway initialized', { config: this.config });
  }

  /**
   * Start the API Gateway server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });
      
      this.server.on('error', (error: Error) => {
        this.logger.error('Server error', { error: error.message });
        reject(error);
      });
      
      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(`API Gateway started on ${this.config.host}:${this.config.port}`);
        this.emit('server:started', { host: this.config.host, port: this.config.port });
        resolve();
      });
    });
  }

  /**
   * Stop the API Gateway server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('API Gateway stopped');
          this.emit('server:stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Register a route
   */
  route(
    method: string,
    path: string,
    handler: APIHandler,
    options?: {
      middleware?: APIMiddleware[];
      rateLimit?: RateLimitConfig;
      authentication?: boolean;
      authorization?: string[];
    }
  ): void {
    const route: APIRoute = {
      id: this.generateRouteId(method, path),
      path: this.normalizePath(path),
      method: method.toUpperCase(),
      handler,
      middleware: options?.middleware || [],
      rateLimit: options?.rateLimit,
      authentication: options?.authentication ?? true,
      authorization: options?.authorization,
      circuitBreaker: new CircuitBreaker({ threshold: 5, timeout: 30000 }),
      metadata: {}
    };
    
    this.routes.set(route.id, route);
    
    this.logger.info('Route registered', {
      method: route.method,
      path: route.path,
      authentication: route.authentication
    });
  }

  /**
   * Register global middleware
   */
  use(middleware: APIMiddleware): void {
    this.middlewares.push(middleware);
    this.logger.info('Global middleware registered');
  }

  /**
   * Convenience methods for HTTP verbs
   */
  get(path: string, handler: APIHandler, options?: any): void {
    this.route('GET', path, handler, options);
  }

  post(path: string, handler: APIHandler, options?: any): void {
    this.route('POST', path, handler, options);
  }

  put(path: string, handler: APIHandler, options?: any): void {
    this.route('PUT', path, handler, options);
  }

  delete(path: string, handler: APIHandler, options?: any): void {
    this.route('DELETE', path, handler, options);
  }

  patch(path: string, handler: APIHandler, options?: any): void {
    this.route('PATCH', path, handler, options);
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Parse request
      const apiRequest = await this.parseRequest(req, requestId);
      const apiResponse = this.createResponse(res, requestId);
      
      // Set request timeout
      const timeoutId = setTimeout(() => {
        if (!apiResponse.sent) {
          apiResponse.error('Request timeout', 408);
        }
      }, this.config.requestTimeout);
      
      // Find matching route
      const route = this.findRoute(apiRequest.method, apiRequest.path);
      if (!route) {
        clearTimeout(timeoutId);
        apiResponse.error('Route not found', 404);
        return;
      }
      
      // Apply rate limiting
      if (route.rateLimit) {
        const rateLimitPassed = await this.checkRateLimit(apiRequest, route.rateLimit);
        if (!rateLimitPassed) {
          clearTimeout(timeoutId);
          apiResponse.error('Rate limit exceeded', 429);
          return;
        }
      }
      
      // Authentication
      if (route.authentication) {
        const authPassed = await this.authenticate(apiRequest);
        if (!authPassed) {
          clearTimeout(timeoutId);
          apiResponse.error('Authentication required', 401);
          return;
        }
      }
      
      // Authorization
      if (route.authorization) {
        const authzPassed = await this.authorize(apiRequest, route.authorization);
        if (!authzPassed) {
          clearTimeout(timeoutId);
          apiResponse.error('Insufficient permissions', 403);
          return;
        }
      }
      
      // Execute middleware chain
      await this.executeMiddlewareChain(apiRequest, apiResponse, [
        ...this.middlewares,
        ...route.middleware
      ]);
      
      if (apiResponse.sent) {
        clearTimeout(timeoutId);
        return;
      }
      
      // Execute route handler with circuit breaker
      await route.circuitBreaker!.execute(async () => {
        await route.handler(apiRequest, apiResponse);
      });
      
      clearTimeout(timeoutId);
      
      // Record metrics
      const responseTime = Date.now() - startTime;
      this.recordMetrics(apiRequest, apiResponse, responseTime);
      
    } catch (error) {
      this.logger.error('Request handling failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  }

  /**
   * Parse incoming request
   */
  private async parseRequest(req: IncomingMessage, requestId: string): Promise<APIRequest> {
    const url = parse(req.url || '', true);
    
    const apiRequest: APIRequest = {
      id: requestId,
      method: req.method || 'GET',
      url: req.url || '',
      path: url.pathname || '/',
      query: url.query as Record<string, string>,
      headers: req.headers as Record<string, string>,
      params: {},
      timestamp: Date.now(),
      ip: req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Parse body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(apiRequest.method)) {
      apiRequest.body = await this.parseBody(req);
    }
    
    return apiRequest;
  }

  /**
   * Parse request body
   */
  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const contentType = req.headers['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            resolve(JSON.parse(body));
          } else {
            resolve(body);
          }
        } catch (error) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      
      req.on('error', reject);
    });
  }

  /**
   * Create API response wrapper
   */
  private createResponse(res: ServerResponse, requestId: string): APIResponse {
    const apiResponse: APIResponse = {
      id: requestId,
      status: 200,
      headers: {},
      sent: false,
      timestamp: Date.now(),
      
      json(data: any) {
        if (this.sent) return;
        this.sent = true;
        this.headers['Content-Type'] = 'application/json';
        res.writeHead(this.status, this.headers);
        res.end(JSON.stringify(data));
      },
      
      text(data: string) {
        if (this.sent) return;
        this.sent = true;
        this.headers['Content-Type'] = 'text/plain';
        res.writeHead(this.status, this.headers);
        res.end(data);
      },
      
      error(message: string, status: number = 500) {
        if (this.sent) return;
        this.status = status;
        this.json({ error: message, timestamp: Date.now() });
      },
      
      success(data?: any, message?: string) {
        if (this.sent) return;
        this.status = 200;
        this.json({
          success: true,
          message: message || 'Operation successful',
          data,
          timestamp: Date.now()
        });
      }
    };
    
    return apiResponse;
  }

  /**
   * Find matching route
   */
  private findRoute(method: string, path: string): APIRoute | undefined {
    for (const route of this.routes.values()) {
      if (route.method === method && this.matchPath(route.path, path)) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Match path with route pattern
   */
  private matchPath(routePath: string, requestPath: string): boolean {
    // Simple path matching - could be enhanced with proper pattern matching
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    
    if (routeParts.length !== requestParts.length) {
      return false;
    }
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];
      
      if (routePart.startsWith(':')) {
        // Parameter - matches any value
        continue;
      }
      
      if (routePart !== requestPart) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(request: APIRequest, config: RateLimitConfig): Promise<boolean> {
    const key = config.keyGenerator ? config.keyGenerator(request) : request.ip;
    const now = Date.now();
    
    let rateLimitInfo = this.rateLimitStore.get(key);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      rateLimitInfo = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.rateLimitStore.set(key, rateLimitInfo);
    }
    
    rateLimitInfo.count++;
    
    return rateLimitInfo.count <= config.maxRequests;
  }

  /**
   * Authenticate request
   */
  private async authenticate(request: APIRequest): Promise<boolean> {
    try {
      // Use security manager for authentication
      const authHeader = request.headers.authorization;
      if (!authHeader) return false;
      
      // Simple Bearer token authentication
      const token = authHeader.replace('Bearer ', '');
      const payload = this.security.verifySecureToken(token, process.env.JWT_SECRET || 'default-secret');
      
      if (payload) {
        request.user = payload;
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Authorize request
   */
  private async authorize(request: APIRequest, requiredPermissions: string[]): Promise<boolean> {
    if (!request.user) return false;
    
    const userPermissions = request.user.permissions || [];
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewareChain(
    request: APIRequest,
    response: APIResponse,
    middlewares: APIMiddleware[]
  ): Promise<void> {
    let index = 0;
    
    const next = async (): Promise<void> => {
      if (index >= middlewares.length) return;
      
      const middleware = middlewares[index++];
      await middleware(request, response, next);
    };
    
    await next();
  }

  /**
   * Setup default middlewares
   */
  private setupDefaultMiddlewares(): void {
    // CORS middleware
    if (this.config.enableCors) {
      this.use(async (request, response, next) => {
        response.headers['Access-Control-Allow-Origin'] = this.config.corsOrigins.join(', ');
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        
        if (request.method === 'OPTIONS') {
          response.status = 204;
          response.text('');
          return;
        }
        
        await next();
      });
    }
    
    // Request logging middleware
    this.use(async (request, response, next) => {
      this.logger.info('Request received', {
        method: request.method,
        path: request.path,
        ip: request.ip,
        userAgent: request.userAgent
      });
      
      await next();
    });
    
    // Security headers middleware
    this.use(async (request, response, next) => {
      response.headers['X-Content-Type-Options'] = 'nosniff';
      response.headers['X-Frame-Options'] = 'DENY';
      response.headers['X-XSS-Protection'] = '1; mode=block';
      
      await next();
    });
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(request: APIRequest, response: APIResponse, responseTime: number): void {
    if (!this.config.enableMetrics) return;
    
    this.monitor.recordMetric({
      name: 'api.request.duration',
      value: responseTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'network',
      tags: {
        method: request.method,
        path: request.path,
        status: response.status.toString()
      }
    });
    
    this.monitor.recordMetric({
      name: 'api.request.count',
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      category: 'network',
      tags: {
        method: request.method,
        status: response.status.toString()
      }
    });
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRouteId(method: string, path: string): string {
    return `${method}:${path}`;
  }

  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, info] of this.rateLimitStore) {
        if (now > info.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Load balancing methods
   */
  registerService(serviceName: string, instances: any[]): void {
    this.serviceInstances.set(serviceName, instances);
    this.loadBalancerCounters.set(serviceName, 0);
    
    this.logger.info('Service registered', { serviceName, instanceCount: instances.length });
  }

  private selectServiceInstance(serviceName: string): any | undefined {
    const instances = this.serviceInstances.get(serviceName);
    if (!instances || instances.length === 0) return undefined;
    
    const algorithm = this.config.loadBalancer?.algorithm || 'round-robin';
    
    switch (algorithm) {
      case 'round-robin':
        const counter = this.loadBalancerCounters.get(serviceName) || 0;
        const instance = instances[counter % instances.length];
        this.loadBalancerCounters.set(serviceName, counter + 1);
        return instance;
        
      case 'least-connections':
        // Simple implementation - would need connection tracking
        return instances[0];
        
      default:
        return instances[0];
    }
  }

  /**
   * OpenAPI documentation
   */
  generateOpenAPISpec(): any {
    if (!this.config.enableOpenAPI) return null;
    
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Nucleus API Gateway',
        version: '3.1.0',
        description: 'Professional API Gateway for Nucleus System'
      },
      paths: {} as any
    };
    
    this.routes.forEach(route => {
      if (!spec.paths[route.path]) {
        spec.paths[route.path] = {};
      }
      
      spec.paths[route.path][route.method.toLowerCase()] = {
        summary: `${route.method} ${route.path}`,
        parameters: [],
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '500': { description: 'Internal Server Error' }
        }
      };
    });
    
    return spec;
  }

  /**
   * Health check endpoint
   */
  setupHealthCheck(): void {
    this.get('/health', async (request, response) => {
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        routes: this.routes.size,
        memory: process.memoryUsage(),
        version: '3.1.0'
      };
      
      response.success(health, 'API Gateway is healthy');
    }, { authentication: false });
  }

  /**
   * Metrics endpoint
   */
  setupMetricsEndpoint(): void {
    this.get('/metrics', async (request, response) => {
      const metrics = this.monitor.getMetrics();
      response.success(metrics, 'Performance metrics');
    }, { authentication: false });
  }
}

// Export types
export type {
  APIRoute,
  APIHandler,
  APIMiddleware,
  APIRequest,
  APIResponse,
  RateLimitConfig,
  LoadBalancerConfig,
  APIGatewayConfig
};