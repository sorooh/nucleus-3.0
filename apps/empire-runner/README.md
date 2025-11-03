# 👑 Emperor Nicholas - Phase Ω (11.5)
## Empire Pro+ Autonomous Bootstrap Runner

**Supreme Sovereign Mode - Unified Empire Startup**

---

## Overview

The **Empire Runner** is a unified startup system that orchestrates the entire Surooh Empire with a single command. It manages all autonomous systems, intelligence layers, and core services in Phase Ω.

## Features

✅ **Single Command Startup** - `npm run start:empire` launches everything  
✅ **13 Integrated Services** - Unified orchestration of all empire modules  
✅ **Health Monitoring** - Real-time service health checks  
✅ **Graceful Shutdown** - Clean termination of all services  
✅ **Periodic Tasks** - Scheduled governance sync and memory consolidation  
✅ **Production Ready** - Docker support with multi-stage builds  

## Architecture

```
Emperor Nicholas (Phase Ω)
├── Nicholas Core (server/index.ts) - Main Express server
├── Full Autonomy System - Decision engine & autonomous operations
├── Evolution Engine - Self-modification system
├── Collective Intelligence - Multi-model AI committee
├── Consciousness Layer - Self-awareness & reflection
├── Auto Development - Builder + Repair systems
├── Academy Intelligence - Learning engines
├── SIDE Integration - Federation gateway
├── Professional Monitoring - System observability
├── Autonomous Governance - Ethical AI oversight
├── Memory Bridge - Vector DB + Memory Hub
├── DNA Engine - Entity system
└── Quantum Mesh - WebSocket command system
```

## Quick Start

### Local Development

```bash
# Install dependencies (root)
npm install

# Build empire-runner
npm run build:runner

# Start entire empire
npm run start:empire

# Or use dev mode (auto-reload)
npm run start:empire:dev
```

### Docker Deployment

**Note**: Empire Runner is optimized for local development. For production Docker deployment, use the `nucleus` service directly in `docker-compose.yml`.

If you want to use Empire Runner in Docker (development setup):

1. Uncomment the `empire-runner` service in `docker-compose.yml`
2. Run:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f empire-runner

# Stop empire
docker-compose down
```

**Production Deployment**: Use `docker-compose up -d nucleus` to run Nicholas Core directly.

## Environment Configuration

Copy `env/.env.example` to `env/.env.local` and configure:

```env
# Required
DATABASE_URL=postgresql://...
NODE_ENV=development

# Feature Flags
QUANTUM_ENABLED=true
GOVERNANCE_ENFORCE=true
EVOLUTION_ENABLED=true

# Optional AI Providers
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Service Registry

| Service | Priority | Critical | Port |
|---------|----------|----------|------|
| Nicholas Core | 1 | ✅ Yes | 5000 |
| Full Autonomy | 2 | ❌ No | - |
| Evolution | 3 | ❌ No | - |
| Collective Intel | 4 | ❌ No | - |
| Consciousness | 5 | ❌ No | - |
| Auto Development | 6 | ❌ No | - |
| Academy | 7 | ❌ No | - |
| SIDE Integration | 8 | ❌ No | - |
| Monitoring | 9 | ❌ No | - |
| Governance | 10 | ❌ No | - |
| Memory Bridge | 11 | ❌ No | - |
| DNA Engine | 12 | ❌ No | - |
| Quantum Mesh | 13 | ❌ No | - |

## Health Checks

All services implement health checks:

```typescript
GET http://localhost:5000/health
GET http://localhost:5000/api/autonomy/status
```

## Scheduled Tasks

- **Governance Sync**: Every 30 minutes (`*/30 * * * *`)
- **Memory Consolidation**: Every hour (`0 * * * *`)

## Logs

Structured logging with Pino:

```bash
# Production (JSON)
NODE_ENV=production npm run start:empire

# Development (Pretty print)
NODE_ENV=development npm run start:empire:dev
```

## Graceful Shutdown

Press `Ctrl+C` to initiate graceful shutdown:

1. Stops services in reverse priority order
2. Waits for ongoing operations to complete
3. Closes database connections
4. Exits cleanly

## Monitoring

View real-time status:

```bash
# Check all service health
curl http://localhost:5000/health

# View Emperor Dashboard
open http://localhost:5000/emperor
```

## Development

```bash
# Build TypeScript
cd apps/empire-runner
npm run build

# Run directly
node dist/index.js

# Type checking
npm run check
```

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Option 2: Direct Node

```bash
npm run build:runner
NODE_ENV=production node apps/empire-runner/dist/index.js
```

## Troubleshooting

**Issue**: Configuration validation failed  
**Fix**: Check `env/.env.local` has all required values from `env/.env.example`

**Issue**: Nicholas Core fails to start  
**Fix**: Ensure DATABASE_URL is valid and PostgreSQL is accessible

**Issue**: Health check timeout  
**Fix**: Increase `HEALTH_CHECK_TIMEOUT` in environment config

## Architecture Decisions

1. **Hybrid Model**: Empire Runner manages Nicholas Core as child process while other services are integrated modules
2. **Priority-based Startup**: Services start in dependency order (Core → Autonomy → Intelligence)
3. **Non-blocking Failures**: Non-critical service failures don't halt empire startup
4. **Idempotent Operations**: All startup operations can be safely retried

## Phase History

- **Phase Ω (11.0)**: Emperor Dashboard with full autonomy
- **Phase 11.5**: Empire Runner for unified startup
- **Future**: Multi-region deployment, advanced federation

---

**Status**: ✅ Production Ready  
**Version**: 11.5  
**Last Updated**: October 29, 2025  
**Mode**: Supreme Sovereign 👑
