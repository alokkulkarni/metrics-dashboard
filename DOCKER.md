# Docker Setup for Metrics Dashboard

This directory contains Docker configuration for the metrics dashboard application.

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - PostgreSQL: localhost:5432

## Services

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: metrics_dashboard
- **Username**: postgres
- **Password**: password

### Backend API
- **Build**: Custom Node.js application
- **Port**: 3001
- **Health Check**: `/health` endpoint

### Frontend
- **Build**: React application
- **Port**: 3000 (served on port 80 in container)

### Redis (Optional)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Usage**: Caching and session storage

## Environment Variables

The backend uses the following environment variables:

### Database Configuration
- `DB_HOST`: Database hostname (default: postgres)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: metrics_dashboard)
- `DB_USER`: Database username (default: postgres)
- `DB_PASSWORD`: Database password (default: password)

### JIRA Configuration
- `JIRA_BASE_URL`: Your JIRA instance URL
- `JIRA_EMAIL`: Your JIRA email address
- `JIRA_API_TOKEN`: Your JIRA API token

### Application Configuration
- `NODE_ENV`: Environment (development/production)
- `PORT`: Application port (default: 3001)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `JWT_SECRET`: JWT secret key for authentication

## Docker Commands

### Development
```bash
# Start all services in development mode
docker-compose up --build

# Start specific service
docker-compose up postgres backend

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production
```bash
# Build and start in production mode
docker-compose -f docker-compose.yml up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Database Management
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d metrics_dashboard

# Backup database
docker-compose exec postgres pg_dump -U postgres metrics_dashboard > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d metrics_dashboard < backup.sql
```

## Volumes

- `postgres_data`: PostgreSQL data persistence
- `redis_data`: Redis data persistence
- `backend_logs`: Backend application logs

## Networking

All services are connected through the `app-network` bridge network, allowing internal communication between containers.

## Health Checks

- **PostgreSQL**: `pg_isready` command
- **Backend**: HTTP GET to `/health` endpoint
- **Frontend**: HTTP GET to root path
- **Redis**: `redis-cli ping` command

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is healthy: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. Verify database connection: `docker-compose exec postgres psql -U postgres -d metrics_dashboard`

### Backend Build Issues
1. Clear Docker cache: `docker system prune -a`
2. Rebuild without cache: `docker-compose build --no-cache backend`

### Frontend Issues
1. Check if backend is accessible: `curl http://localhost:3001/health`
2. Verify environment variables: `docker-compose exec frontend env`

### Performance Issues
1. Check resource usage: `docker stats`
2. Increase memory limits in docker-compose.yml if needed

## Security Notes

- Change default passwords in production
- Use environment variables for sensitive data
- Consider using Docker secrets for production deployments
- Regularly update base images for security patches

## Development Setup

For development with hot-reload:

1. Use the override file (automatically applied):
   ```bash
   docker-compose up --build
   ```

2. The override file mounts source code for live updates:
   - Backend: `./backend/src` → `/app/src`
   - Frontend: `./frontend/src` → `/app/src`

## Monitoring

Consider adding monitoring services:
- Prometheus for metrics collection
- Grafana for dashboards
- Jaeger for distributed tracing
- ELK stack for log aggregation
