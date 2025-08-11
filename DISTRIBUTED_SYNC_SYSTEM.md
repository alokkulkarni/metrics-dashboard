# Distributed Synchronization System

## Overview

This system ensures that when the backend scales to multiple pods, only one pod performs sync operations at a time, preventing duplicate work, race conditions, and API rate limit issues.

## Key Components

### 1. DistributedLock Model (`src/models/DistributedLock.ts`)

**Purpose**: Manages distributed locks across multiple pod instances.

**Key Features**:
- **Atomic Lock Acquisition**: Uses database transactions with row-level locking
- **Automatic Renewal**: Locks are automatically renewed every 10 minutes
- **Expiration Safety**: Locks expire after 30-60 minutes to prevent indefinite holds
- **Graceful Cleanup**: Locks are released on process exit (SIGINT/SIGTERM)
- **Pod Identification**: Each pod gets a unique ID (hostname-pid-timestamp)

**Database Schema**:
```sql
CREATE TABLE distributed_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lock_name VARCHAR(255) NOT NULL,           -- e.g., 'sync-all', 'sync-project-ABC'
  pod_id VARCHAR(255) NOT NULL,              -- unique pod identifier
  acquired_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  renewed_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Ensures only one active lock per lock_name
CREATE UNIQUE INDEX distributed_locks_unique_active_lock 
  ON distributed_locks (lock_name, pod_id, is_active) 
  WHERE is_active = true;
```

### 2. Enhanced SyncService (`src/services/syncService.ts`)

**Distributed Lock Integration**:

- **Full Sync** (`syncAll`): Uses lock `'sync-all'` (60-minute duration)
- **Project Sync** (`syncProject`): Uses lock `'sync-project-{projectKey}'` (30-minute duration)
- **Board/Sprint Sync**: Can be extended with locks if needed

**Lock Flow**:
1. Try to acquire distributed lock
2. If lock is held by another pod → return gracefully with message
3. If lock acquired → proceed with sync operation
4. Always release lock in `finally` block

### 3. Protected API Endpoints

**Changelog Sync** (`src/routes/changelog.ts`):
- `POST /api/changelog/sync` - Protected with `'changelog-sync'` lock
- Returns HTTP 409 if another pod is already syncing
- Automatic lock cleanup on completion/failure

**Sync Operations** (`src/routes/sync.ts`):
- All sync endpoints automatically protected via SyncService locks
- `POST /api/sync` - Full sync with distributed locking
- `POST /api/sync/project/:projectKey` - Project sync with distributed locking

### 4. Monitoring APIs (`src/routes/locks.ts`)

**Lock Status Monitoring**:
- `GET /api/locks/status` - View currently active locks
- `GET /api/locks/status?lockName=sync-all` - Check specific lock
- `GET /api/locks/history` - View lock acquisition history
- `POST /api/locks/cleanup` - Manual cleanup of expired locks

### 5. Automatic Maintenance

**Startup Cleanup**: 
- Expired locks cleaned up when container starts
- Ensures clean slate for new deployments

**Periodic Cleanup**: 
- Every 10 minutes, expired locks are automatically cleaned up
- Prevents database bloat and handles edge cases

## Pod Scaling Behavior

### Single Pod → Multiple Pods

**Before Scaling**:
```
Pod-1: Running sync operations normally
```

**During/After Scaling**:
```
Pod-1: Acquires 'sync-all' lock, continues operation
Pod-2: Attempts 'sync-all' lock → blocked, logs "already running on Pod-1"
Pod-3: Attempts 'sync-all' lock → blocked, logs "already running on Pod-1"
```

### Load Balancer Behavior

**API Calls**:
- `/api/sync` called on Pod-2 → Pod-2 tries lock → sees Pod-1 has it → returns HTTP 409
- `/api/sync` called on Pod-3 → Pod-3 tries lock → sees Pod-1 has it → returns HTTP 409
- Client gets clear message: "Sync already running on pod-xyz"

### Container Restart/Failure

**Graceful Shutdown**:
```bash
# Pod receives SIGTERM
Pod-1: Releasing distributed locks...
Pod-1: Released 'sync-all' lock
Pod-1: Shutdown complete
```

**Ungraceful Shutdown**:
- Lock expires automatically (30-60 minutes)
- Other pods can acquire lock after expiration
- Periodic cleanup removes stale locks

## Configuration

### Environment Variables

```bash
# Database connection for locks
DATABASE_URL=postgresql://user:pass@host:port/db

# Pod identification
HOSTNAME=metrics-dashboard-pod-123  # Usually set by Kubernetes
```

### Docker Compose Integration

The migration system automatically creates the `distributed_locks` table when containers start:

```yaml
# docker-compose.yml
services:
  backend:
    # ... existing config ...
    environment:
      - HOSTNAME=${HOSTNAME:-metrics-dashboard-backend}
    # Migration runs automatically on startup
```

### Kubernetes Integration

```yaml
# deployment.yaml
spec:
  replicas: 3  # Scale to multiple pods
  template:
    spec:
      containers:
      - name: metrics-dashboard
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name  # Unique pod name
```

## Benefits

### 1. **Prevents Duplicate Work**
- Only one pod syncs data at a time
- Eliminates race conditions between pods
- Reduces database conflicts

### 2. **API Rate Limit Compliance**
- Single pod makes Jira API calls
- Prevents rate limit violations from multiple pods
- Better API quota management

### 3. **Resource Efficiency**
- Avoids redundant processing across pods
- Reduces database load
- Optimizes memory and CPU usage

### 4. **Operational Safety**
- Clean failure handling with lock cleanup
- Monitoring and debugging capabilities
- Graceful degradation during scaling

### 5. **Monitoring & Observability**
- Lock status APIs for operations teams
- Historical tracking of sync operations
- Clear logging of pod coordination

## Example Scenarios

### Scenario 1: Scheduled Sync During High Load

```
14:00 - Cron triggers sync on all 3 pods
14:00:01 - Pod-1 acquires 'sync-all' lock
14:00:02 - Pod-2 attempts lock → blocked → logs warning
14:00:03 - Pod-3 attempts lock → blocked → logs warning
14:15 - Pod-1 completes sync → releases lock
14:15:01 - Next scheduled sync can now acquire lock
```

### Scenario 2: Manual Sync via API

```
User → Load Balancer → Pod-2: POST /api/sync
Pod-2: Attempts lock → already held by Pod-1
Response: HTTP 409 "Sync already running on pod-1-abc123"
```

### Scenario 3: Pod Failure During Sync

```
Pod-1: Syncing with lock acquired
Pod-1: Crashes unexpectedly
Pod-2: Attempts sync → lock still shows active
Pod-2: Waits for lock expiration (max 60 minutes)
After expiration: Pod-2 can acquire lock and continue
```

## Migration Integration

The distributed locks table is created automatically through the existing migration system:

1. **Migration File**: `014_create_distributed_locks.js`
2. **Auto-Execution**: Runs when containers start via existing `MigrationRunner`
3. **Database Compatibility**: Works with existing PostgreSQL setup
4. **Rollback Support**: Includes `down()` migration for cleanup

This ensures seamless integration with the current Docker Compose deployment without requiring manual database changes.
