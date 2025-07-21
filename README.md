# Metrics Dashboard

A full-stack React/Node.js application for managing and visualizing Jira board metrics. The application provides a comprehensive dashboard to sync, view, and manage Jira boards with PostgreSQL database storage.

## Features

- 🔄 **Jira Integration**: Sync boards and projects from Jira Cloud
- 📊 **Dashboard**: Comprehensive metrics and statistics
- 🗃️ **Database Storage**: PostgreSQL for persistent data storage
- 🎨 **Modern UI**: React with Tailwind CSS
- 🧪 **Testing**: Jest unit tests and Playwright e2e tests
- 🐳 **Docker**: Complete containerization setup
- 🔒 **Security**: JWT authentication and security headers

## Tech Stack

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Vite** - Build tool
- **Jest** - Unit testing
- **Playwright** - E2E testing

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **Winston** - Logging
- **Jest** - Unit testing
- **Joi** - Validation

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container setup
- **Nginx** - Frontend web server

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Jira Cloud account with API access

### 1. Clone and Setup
```bash
git clone <repository-url>
cd metrics-dashboard

# Copy environment file
cp .env.example .env

# Edit .env with your Jira credentials
nano .env
```

### 2. Docker Development Setup
```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 3. Local Development Setup
```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Start PostgreSQL (if not using Docker)
# Update backend/.env with your database credentials

# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

### 4. Configure Jira Integration
1. Generate a Jira API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create API token
2. Update `.env` file with your Jira details:
   ```env
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   ```

## Usage

### 1. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

### 2. Sync Jira Data
1. Navigate to Settings to test Jira connection
2. Use the "Sync Boards" button in the sidebar
3. View synced boards in the Boards section

### 3. Explore Features
- **Dashboard**: View board statistics and recent activity
- **Boards**: Browse, filter, and manage boards
- **Board Details**: View detailed information about specific boards
- **Settings**: Configure Jira integration and test connections

## API Endpoints

### Boards
- `GET /api/boards` - Get all boards with filtering
- `GET /api/boards/stats` - Get board statistics
- `GET /api/boards/:id` - Get specific board
- `PATCH /api/boards/:id/status` - Update board status
- `POST /api/boards/sync` - Sync boards from Jira

### Jira
- `GET /api/jira/test-connection` - Test Jira connection
- `GET /api/jira/boards` - Get boards from Jira API
- `GET /api/jira/projects` - Get projects from Jira API
- `POST /api/jira/sync-boards` - Sync boards from Jira

## Development

### Backend Development
```bash
cd backend

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Frontend Development
```bash
cd frontend

# Run development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### Database Management
```bash
# Connect to PostgreSQL (if using Docker)
docker-compose exec postgres psql -U postgres -d metrics_dashboard

# View tables
\dt

# View board data
SELECT * FROM boards;
```

## Testing

### Unit Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run all tests
npm test
```

### E2E Tests
```bash
cd frontend

# Run Playwright tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui
```

## Deployment

### Production Docker Setup
```bash
# Build and start production containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Environment Variables
Create `.env` file with these variables:
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JWT_SECRET=your-secure-secret-key
```

## Project Structure

```
metrics-dashboard/
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── config/            # Database and logging config
│   │   ├── models/            # Sequelize models
│   │   ├── routes/            # Express routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Express middleware
│   │   └── index.js           # Main application
│   ├── __tests__/             # Jest tests
│   ├── Dockerfile             # Production container
│   ├── Dockerfile.dev         # Development container
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Utility functions
│   ├── e2e/                   # Playwright tests
│   ├── __tests__/             # Jest tests
│   ├── Dockerfile             # Production container
│   ├── Dockerfile.dev         # Development container
│   └── package.json
├── docker-compose.yml         # Production setup
├── docker-compose.dev.yml     # Development setup
└── README.md
```

## Database Schema

### Boards Table
```sql
- id: Primary key
- board_id: Jira board ID (unique)
- name: Board name
- type: Board type (scrum, kanban, simple)
- project_key: Associated project key
- project_id: Associated project ID
- project_name: Associated project name
- self_url: Jira board URL
- is_active: Board status
- description: Board description
- location: Board location (JSON)
- configuration: Board config (JSON)
- last_synced_at: Last sync timestamp
- created_at: Record creation time
- updated_at: Record update time
```

### Projects Table
```sql
- id: Primary key
- project_id: Jira project ID (unique)
- key: Project key (unique)
- name: Project name
- description: Project description
- lead: Project lead info (JSON)
- project_type_key: Project type
- avatar_urls: Avatar URLs (JSON)
- is_private: Privacy flag
- self_url: Jira project URL
- last_synced_at: Last sync timestamp
- created_at: Record creation time
- updated_at: Record update time
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature-name`
7. Create a Pull Request

## Troubleshooting

### Common Issues

1. **Jira Connection Failed**
   - Verify API token is valid
   - Check Jira base URL format
   - Ensure email is correct

2. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify database credentials
   - Ensure database exists

3. **Frontend Build Error**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version (18+)

4. **Docker Issues**
   - Check Docker daemon is running
   - Free up disk space
   - Rebuild containers: `docker-compose build --no-cache`

### Logs
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# Database logs
docker-compose logs postgres

# All logs
docker-compose logs -f
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Create an issue with detailed information
