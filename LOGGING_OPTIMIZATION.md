# Logging Optimization Summary

## Overview

This document summarizes the changes made to optimize logging and reduce log file sizes across the application. The primary focus was to disable debug logging in production environments while maintaining proper error tracking.

## Changes Made

### 1. Backend Logging Configuration

#### Environment Variable Changes
- **File**: `backend/.env`
- **Change**: Updated `LOG_LEVEL=debug` to `LOG_LEVEL=info`
- **Impact**: Reduces verbose debug output in development environment

#### Logging Configuration Files
- **File**: `backend/src/config.ts`
  - Uses environment variable `LOG_LEVEL` with fallback to 'info'
  - Properly configured with Winston logger
- **File**: `backend/src/utils/logger.ts`
  - Winston logger configured with file and console transports
  - Uses log level from configuration

### 2. Production Environment Configuration

#### AKS Kubernetes Manifests
- **File**: `aks/manifests/01-configmap.yaml`
- **Setting**: `LOG_LEVEL: "info"`
- **Status**: ✅ Already configured correctly

#### Helm Chart Configuration
- **File**: `aks/helm/metrics-dashboard/values.yaml`
- **Setting**: `logLevel: "info"`
- **Template**: `aks/helm/metrics-dashboard/templates/configmap.yaml`
- **Status**: ✅ Already configured correctly

#### Docker Compose Configuration
- **File**: `docker-compose.aks.yml`
- **Setting**: `LOG_LEVEL: info`
- **Status**: ✅ Already configured correctly for production

- **File**: `docker-compose.dev.yml`
- **Setting**: `LOG_LEVEL: debug`
- **Status**: ✅ Correctly maintains debug logging for development

### 3. Frontend Logging Improvements

#### New Logging Utility
- **File**: `frontend/src/utils/logger.ts`
- **Features**:
  - Environment-aware logging (only logs in development mode for warn/info/debug)
  - Always logs errors (production + development)
  - Consistent log formatting with prefixes
  - TypeScript interface for type safety

#### Updated Components
- **File**: `frontend/src/services/api.ts`
  - Replaced `console.error` with `logger.error`
  - Maintains error logging in production for API errors

- **File**: `frontend/src/App.tsx`
  - Replaced `console.error` with `logger.error`
  - Maintains mutation error logging

- **File**: `frontend/src/pages/ResourceSpread.tsx`
  - Replaced `console.warn` with `logger.warn`
  - Replaced `console.error` with `logger.error`
  - Warning messages only appear in development

## Log Level Hierarchy

The application uses the following log levels in order of verbosity:

1. **error** - Always logged (production + development)
2. **warn** - Development only
3. **info** - Development only  
4. **debug** - Development only

## Production vs Development Behavior

### Production Environment
- **Backend**: Info-level logging only
- **Frontend**: Error messages only
- **Result**: Significantly reduced log file sizes

### Development Environment
- **Backend**: Debug-level logging (if .env is changed back to debug)
- **Frontend**: All log levels displayed
- **Result**: Full debugging capabilities

## Expected Impact

### Log File Size Reduction
- **Before**: Debug-level logging generated verbose output including:
  - Database query details
  - HTTP request/response details
  - Internal state changes
  - Detailed error traces

- **After**: Info-level logging provides:
  - Essential application events
  - Error messages
  - Important state changes
  - Minimal noise

### Estimated Reduction
- **Expected**: 60-80% reduction in log file sizes
- **Benefit**: Improved disk usage, easier log analysis, better performance

## Monitoring and Debugging

### Production Debugging
- Error messages still captured for troubleshooting
- Application Insights integration maintains telemetry
- Health check endpoints provide status information

### Development Debugging
- Full logging capabilities available by changing `LOG_LEVEL=debug` in `.env`
- Frontend console shows all messages in development mode
- No impact on development workflow

## Configuration Files Reference

### Environment-Specific Log Levels

| Environment | Configuration File | Log Level Setting |
|-------------|-------------------|------------------|
| Development (.env) | `backend/.env` | `LOG_LEVEL=info` (changed from debug) |
| Development (Docker) | `docker-compose.dev.yml` | `LOG_LEVEL: debug` |
| Production (AKS) | `aks/manifests/01-configmap.yaml` | `LOG_LEVEL: "info"` |
| Production (Helm) | `aks/helm/metrics-dashboard/values.yaml` | `logLevel: "info"` |
| Production (Docker) | `docker-compose.aks.yml` | `LOG_LEVEL: info` |

## Rollback Instructions

If debugging is needed in production:

1. **AKS Environment**:
   ```bash
   kubectl patch configmap metrics-dashboard-config -n metrics-dashboard -p '{"data":{"LOG_LEVEL":"debug"}}'
   kubectl rollout restart deployment/metrics-dashboard -n metrics-dashboard
   ```

2. **Development Environment**:
   ```bash
   # Change backend/.env
   LOG_LEVEL=debug
   ```

3. **Docker Compose**:
   ```yaml
   # In docker-compose.aks.yml
   environment:
     LOG_LEVEL: debug
   ```

## Next Steps

1. **Monitor Log Sizes**: Track log file sizes after deployment to confirm reduction
2. **Performance Testing**: Verify application performance improvements
3. **Log Rotation**: Ensure log rotation policies are in place for remaining logs
4. **Alerting**: Update monitoring alerts to account for reduced log verbosity

## Notes

- All error messages are preserved for troubleshooting
- Frontend logging is environment-aware (development vs production)
- Configuration follows best practices for different deployment environments
- Changes maintain backward compatibility with existing monitoring tools
