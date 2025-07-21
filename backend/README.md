# JIRA Metrics Dashboard Backend

A production-ready Node.js backend for the JIRA metrics dashboard, built with TypeScript, Express, and PostgreSQL.

## Features

- 🔄 **Complete JIRA Integration**: Sync projects, boards, sprints, and issues
- 📊 **Metrics Calculation**: Sprint velocity, churn rate, completion rate, team alignment
- 🏗️ **Production Ready**: Security middleware, logging, error handling, rate limiting
- 📱 **REST API**: Comprehensive API endpoints for all data entities
- 🔐 **Security**: Helmet, CORS, compression, rate limiting out of the box
- 📝 **Logging**: Structured logging with Winston
- 🐳 **Database**: PostgreSQL with Sequelize ORM

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- JIRA instance with API access

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

3. **Update JIRA configuration in `.env`**:
   ```env
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_USERNAME=your-email@example.com
   JIRA_API_TOKEN=your-api-token-here
   ```

4. **Setup database**:
   ```bash
   npm run setup
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

6. **Start the server**:
   ```bash
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID

### Boards
- `GET /api/boards` - Get all boards
- `GET /api/boards/:id` - Get board by ID
- `GET /api/boards/project/:projectId` - Get boards for a project

### Sprints
- `GET /api/sprints` - Get all sprints
- `GET /api/sprints/:id` - Get sprint by ID
- `GET /api/sprints/board/:boardId` - Get sprints for a board
- `GET /api/sprints/active` - Get active sprints

### Issues
- `GET /api/issues` - Get all issues
- `GET /api/issues/:id` - Get issue by ID
- `GET /api/issues/sprint/:sprintId` - Get issues for a sprint
- `GET /api/issues/board/:boardId` - Get issues for a board

### Metrics
- `GET /api/metrics/sprints` - Get all sprint metrics
- `GET /api/metrics/boards` - Get all board metrics
- `GET /api/metrics/sprint/:sprintId` - Get metrics for a sprint
- `GET /api/metrics/board/:boardId` - Get metrics for a board
- `GET /api/metrics/project/:projectId` - Get metrics for a project

### Sync
- `POST /api/sync/full` - Perform full sync
- `POST /api/sync/projects` - Sync projects only
- `POST /api/sync/boards` - Sync boards
- `POST /api/sync/sprints` - Sync sprints
- `POST /api/sync/issues` - Sync issues  
- `POST /api/sync/metrics` - Calculate metrics
- `GET /api/sync/status` - Get sync status

## Data Flow

1. **Projects**: Fetch all accessible JIRA projects
2. **Boards**: Fetch scrum boards linked to projects
3. **Sprints**: Fetch current active sprint + past 6 sprints per board
4. **Issues**: Fetch all issues in the selected sprints
5. **Metrics**: Calculate sprint and board-level metrics

## Metrics Calculated

### Sprint Metrics
- **Velocity**: Story points completed per sprint
- **Churn Rate**: Percentage of scope changes during sprint
- **Completion Rate**: Percentage of committed work completed
- **Team Alignment**: Consistency of team performance

### Board Metrics
- **Average Velocity**: Mean velocity across sprints
- **Velocity Trend**: Velocity change over time
- **Churn Rate**: Average scope changes
- **Completion Rate**: Average completion percentage

## Database Schema

### Models
- **Project**: JIRA project information
- **Board**: Scrum boards with project relationships
- **Sprint**: Sprint details with board relationships
- **Issue**: JIRA issues with sprint relationships
- **SprintMetrics**: Calculated metrics per sprint
- **BoardMetrics**: Aggregate metrics per board

### Relationships
- Project → Boards (1:many)
- Board → Sprints (1:many)
- Sprint → Issues (1:many)
- Sprint → SprintMetrics (1:1)
- Board → BoardMetrics (1:1)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `metrics_dashboard` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JIRA_BASE_URL` | JIRA instance URL | - |
| `JIRA_USERNAME` | JIRA username/email | - |
| `JIRA_API_TOKEN` | JIRA API token | - |
| `LOG_LEVEL` | Logging level | `info` |

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run setup` - Setup and sync database
- `npm run clean` - Clean build directory
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Architecture

### Security
- Helmet for security headers
- CORS for cross-origin requests
- Rate limiting for API protection
- Input validation and sanitization

### Logging
- Winston for structured logging
- Request/response logging
- Error tracking and monitoring

### Error Handling
- Global error handler
- Graceful error responses
- Database connection error handling

### Performance
- Compression middleware
- Database query optimization
- Connection pooling

## Development

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Add route to `src/routes/index.ts`
3. Update this README

### Database Changes

1. Update model in `src/models/`
2. Run `npm run setup` to sync changes
3. Update associations if needed

### Testing

Run tests with:
```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License
