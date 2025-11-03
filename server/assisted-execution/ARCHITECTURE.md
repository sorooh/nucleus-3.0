# Assisted Execution Layer - Architecture Design
**Phase 5.1 → 7.0**

## Overview
تحويل Nicholas من "يفهم المشاكل" إلى "ينفذ الحلول بإذنك"

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Assisted Execution Layer                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Problem    │───→│    Patch     │───→│  Validator   │  │
│  │  Diagnoser   │    │  Generator   │    │   System     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │         │
│         └────────────────────┼────────────────────┘         │
│                              ↓                              │
│                     ┌──────────────┐                        │
│                     │ Orchestrator │                        │
│                     └──────────────┘                        │
│                              │                              │
│         ┌────────────────────┼────────────────────┐         │
│         ↓                    ↓                    ↓         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    Code      │    │    Build     │    │   Approval   │  │
│  │   Executor   │    │   Monitor    │    │    Queue     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Patch Generator
**Purpose:** توليد code patches تلقائياً من المشاكل المكتشفة

**Inputs:**
- Detected issues from Problem Diagnoser
- Affected files and line numbers
- Issue category and severity

**Outputs:**
- Generated code patch (diff format)
- Explanation of the fix
- Estimated impact
- Files to be modified

**AI Integration:**
- Uses Hunyuan-A13B for code generation
- Chain of Thought reasoning for complex fixes
- Tool use for file reading/analysis

**File:** `server/execution/patch-generator/index.ts`

---

### 2. Validator System
**Purpose:** اختبار الـpatches قبل التنفيذ

**Validation Steps:**
1. **Syntax Check**: TypeScript compilation
2. **Type Safety**: Type checking
3. **Dependency Check**: Import validation
4. **Test Execution**: Run existing tests
5. **Security Scan**: Check for security issues

**Outputs:**
- Validation status (pass/fail)
- Error messages if failed
- Safety score (0-100)

**File:** `server/execution/validator/index.ts`

---

### 3. Code Executor
**Purpose:** تنفيذ الـpatches بعد الموافقة

**Execution Flow:**
1. Receive approved patch from Approval Queue
2. Create git branch for changes
3. Apply patch to files
4. Commit changes
5. Log execution results

**Safety Features:**
- Atomic operations (all or nothing)
- Rollback capability
- Audit trail with signatures
- Rate limiting (max patches per hour)

**File:** `server/execution/code-executor/index.ts`

---

### 4. Build Monitor
**Purpose:** مراقبة npm/build errors وتصحيح dependencies

**Monitoring:**
- Watch npm install errors
- Track build failures
- Monitor dependency conflicts
- Detect missing packages

**Auto-Fix Capabilities:**
- Install missing dependencies
- Update package versions
- Resolve version conflicts
- Clear cache if needed

**File:** `server/execution/build-monitor/index.ts`

---

### 5. Orchestrator
**Purpose:** تنسيق العمليات التنفيذية

**Responsibilities:**
- Queue management
- Priority scheduling
- Resource allocation
- Conflict resolution
- Progress tracking

**Workflow:**
```
Issue Detected → Generate Patch → Validate → Queue for Approval → 
→ User Approves → Execute → Monitor → Report Results
```

**File:** `server/execution/orchestrator/index.ts`

---

## Database Schema

### Table: `execution_patches`
```typescript
{
  id: string (uuid)
  issueId: string (reference to detected issue)
  patchContent: string (git diff format)
  explanation: string
  affectedFiles: string[]
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  validationScore: number (0-100)
  validationErrors: string[]
  createdAt: timestamp
  approvedAt: timestamp | null
  approvedBy: string | null
  executedAt: timestamp | null
  executionResult: string | null
  rollbackAvailable: boolean
}
```

### Table: `execution_approvals`
```typescript
{
  id: string (uuid)
  patchId: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: timestamp
  respondedAt: timestamp | null
  approverNotes: string | null
}
```

### Table: `execution_audit`
```typescript
{
  id: string (uuid)
  patchId: string
  action: 'generated' | 'validated' | 'approved' | 'executed' | 'rolled_back'
  actor: string (system | user)
  timestamp: timestamp
  details: jsonb
  signature: string (HMAC)
}
```

---

## API Endpoints

### Patch Management
- `GET /api/execution/patches` - List all patches
- `GET /api/execution/patches/:id` - Get patch details
- `POST /api/execution/patches/generate` - Generate patch from issue
- `POST /api/execution/patches/:id/approve` - Approve patch
- `POST /api/execution/patches/:id/reject` - Reject patch
- `POST /api/execution/patches/:id/execute` - Execute approved patch
- `POST /api/execution/patches/:id/rollback` - Rollback executed patch

### Build Monitor
- `GET /api/execution/build/status` - Current build status
- `GET /api/execution/build/errors` - Recent build errors
- `POST /api/execution/build/fix` - Auto-fix build issue

### System Status
- `GET /api/execution/status` - Overall execution layer status
- `GET /api/execution/queue` - Approval queue status
- `GET /api/execution/audit` - Audit trail

---

## Dashboard Features

### Approval Queue Tab
- Pending patches awaiting approval
- Preview diff with syntax highlighting
- Validation results display
- One-click approve/reject
- Batch approval for safe patches

### Execution History Tab
- Timeline of executed patches
- Success/failure statistics
- Rollback interface
- Audit trail viewer

### Build Monitor Tab
- Real-time build status
- Dependency health check
- Auto-fix suggestions
- Error logs

---

## Safety & Governance

### Constraints
- Maximum 10 patches in queue
- Maximum 5 executions per hour
- Minimum validation score: 80/100
- Critical files require manual approval
- No patches to `server/ai/` or `modules/` (legacy)

### Audit Trail
- Every action is logged
- HMAC signatures for verification
- Immutable audit log
- Complies with Nicholas governance

---

## Integration Points

### With Awareness Layer
- Consumes issues from Problem Diagnoser
- Uses Knowledge Graph for impact analysis
- Feeds execution results back to Log Processor

### With AI Committee
- Patch generation uses AI Committee
- Validation uses Claude for safety review
- Explanation generation uses Hunyuan

### With Federation
- Can execute patches on external nuclei (future)
- Reports execution status via Federation Gateway

---

## Success Metrics

- **Patch Accuracy**: % of patches that compile successfully
- **Execution Success**: % of executed patches without rollback
- **Build Health**: % reduction in build errors
- **Response Time**: Average time from issue detection to fix
- **User Satisfaction**: % of approved vs rejected patches

---

## Implementation Phases

### Phase 5.1-5.5: Core Infrastructure
- [x] Architecture design
- [ ] Database schema
- [ ] Patch Generator
- [ ] Validator
- [ ] Code Executor

### Phase 5.6-6.3: Orchestration
- [ ] Orchestrator
- [ ] Approval Queue
- [ ] Build Monitor

### Phase 6.4-7.0: Dashboard & Polish
- [ ] Dashboard UI
- [ ] API endpoints
- [ ] Testing & validation
- [ ] Documentation

---

**Status:** Architecture designed - Ready for implementation
**Next:** Create database schema and start Patch Generator
