# Integration Hub - API Contract Documentation

## Overview
This document defines the **professional API contract** used by Integration Hub when communicating with SIDE nodes, Academy platforms, and external services.

## Standard: Base64 for Binary Files

Integration Hub follows **industry-standard practices** used by major platforms:
- ✅ GitHub API
- ✅ GitLab API  
- ✅ Bitbucket API
- ✅ Azure DevOps API

---

## File Encoding Strategy

### Text Files (UTF-8)
Source code, configuration, documentation files are transmitted as plain UTF-8 strings.

**Examples:**
- `.ts`, `.js`, `.tsx`, `.jsx`
- `.json`, `.yaml`, `.yml`
- `.md`, `.txt`, `.html`, `.css`
- `.py`, `.go`, `.rs`

**Format:**
```json
{
  "file": "src/index.ts",
  "content": "const x = 1;\nexport default x;",
  "encoding": "utf-8"
}
```

### Binary Files (Base64)
Images, PDFs, executables, and other binary files are transmitted as Base64-encoded strings.

**Examples:**
- `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`
- `.pdf`, `.docx`, `.xlsx`
- `.wasm`, `.bin`
- `.zip`, `.tar`, `.gz`

**Format:**
```json
{
  "file": "assets/logo.png",
  "content": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "encoding": "base64"
}
```

---

## API Endpoints

### 1. Fetch File
**GET** `/api/codebase/file`

**Query Parameters:**
- `repository` (required): Repository identifier
- `file` (required): File path
- `branch` (optional): Branch name (default: `main`)

**Response:**
```json
{
  "content": "file content (UTF-8 or Base64)",
  "encoding": "utf-8" | "base64",
  "size": 1024,
  "checksum": "sha256-hash"
}
```

### 2. Push Changes
**POST** `/api/codebase/push`

**Request Body:**
```json
{
  "changes": [
    {
      "file": "src/index.ts",
      "action": "UPDATE",
      "content": "const x = 1;",
      "encoding": "utf-8",
      "reason": "Fix variable initialization"
    },
    {
      "file": "assets/logo.png",
      "action": "CREATE",
      "content": "iVBORw0KGgo...",
      "encoding": "base64",
      "reason": "Add company logo"
    }
  ],
  "commitMessage": "Update files",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "commitHash": "abc123def456",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 3. Create Pull Request
**POST** `/api/codebase/pull-request`

**Request Body:**
```json
{
  "title": "Integration Hub Changes",
  "description": "Automated changes description",
  "branch": "feature/integration-hub-123",
  "baseBranch": "main",
  "changes": [
    {
      "file": "src/index.ts",
      "action": "UPDATE",
      "content": "...",
      "encoding": "utf-8",
      "reason": "..."
    }
  ]
}
```

**Response:**
```json
{
  "prUrl": "https://platform.com/repo/pulls/123",
  "prId": "123"
}
```

---

## Data Integrity

### Checksums
All files include **SHA-256 checksums** calculated on **original bytes**:

**Text File:**
```
Original: "const x = 1;"
Checksum: SHA-256(Buffer.from("const x = 1;", "utf-8"))
```

**Binary File:**
```
Original: <PNG bytes>
Base64: "iVBORw0KGgo..."
Checksum: SHA-256(<PNG bytes>) // On ORIGINAL bytes, not Base64!
```

### Verification Process
1. Decode Base64 to original bytes (if binary)
2. Calculate SHA-256 on original bytes
3. Compare with stored checksum
4. Accept only if match is exact

---

## Backup & Rollback

### Backup Storage (Database)
```json
{
  "backupId": "backup_1234567890_node1",
  "nucleusId": "side-node-01",
  "repository": "https://github.com/user/repo",
  "branch": "main",
  "files": [
    {
      "file": "src/index.ts",
      "content": "const x = 1;",
      "encoding": "utf-8",
      "checksum": "abc123...",
      "size": 12,
      "timestamp": "2025-01-01T00:00:00Z"
    },
    {
      "file": "assets/logo.png",
      "content": "iVBORw0KGgo...",
      "encoding": "base64",
      "checksum": "def456...",
      "size": 5000,
      "timestamp": "2025-01-01T00:00:00Z"
    }
  ],
  "changeCount": 2,
  "totalSize": 5012,
  "checksumValid": 1
}
```

### Rollback Process
1. Fetch backup from database
2. Verify `checksumValid` flag
3. For each file:
   - Decode Base64 to bytes (if binary)
   - Verify checksum on original bytes
   - Keep Base64 for binary files when pushing
   - Keep UTF-8 for text files when pushing
4. Push verified changes via API

---

## Error Handling

### Checksum Mismatch
```json
{
  "error": "Checksum verification failed",
  "file": "assets/logo.png",
  "expected": "def456...",
  "actual": "789abc...",
  "action": "ROLLBACK_ABORTED"
}
```

### Empty Backup
```json
{
  "error": "Backup failed: 3 files need backup but none could be retrieved",
  "failedFiles": ["src/a.ts", "src/b.ts", "assets/logo.png"]
}
```

---

## Best Practices

### ✅ DO:
- Use Base64 for all binary files
- Calculate checksums on original bytes
- Verify checksums before rollback
- Include encoding metadata in all API calls
- Handle partial backup failures gracefully

### ❌ DON'T:
- Convert binary to UTF-8 strings
- Calculate checksums on Base64 strings
- Skip checksum verification
- Assume all files are text
- Deploy without backup

---

## Compliance

This API contract complies with:
- **RFC 4648** - Base64 Encoding
- **JSON RFC 8259** - JSON Data Interchange Format
- **HTTP RFC 7231** - Hypertext Transfer Protocol

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-31  
**Author:** Integration Hub Team - Abu Sham Vision
