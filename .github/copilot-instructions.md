# Copilot Instructions for Metrics Dashboard

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a full-stack React/Node.js application for managing and visualizing Jira board metrics. The application consists of:

- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React application with Tailwind CSS
- **Integration**: Jira Cloud API integration
- **Testing**: Jest unit tests and Playwright e2e tests
- **Deployment**: Docker containers with Docker Compose

## Code Style and Conventions

### General
- Use ES6+ features and modern JavaScript/React patterns
- Follow consistent naming conventions (camelCase for variables/functions, PascalCase for components)
- Use async/await for asynchronous operations
- Include proper error handling and logging
- Write descriptive comments for complex logic

### Backend (Node.js/Express)
- Use ES modules (import/export) instead of CommonJS
- Implement proper error handling middleware
- Use Joi for request validation
- Use Winston for logging
- Follow RESTful API conventions
- Use Sequelize ORM for database operations
- Include security headers and middleware

### Frontend (React)
- Use functional components with hooks
- Implement proper component composition
- Use React Query for API state management
- Use Tailwind CSS for styling (no CSS modules or styled-components)
- Implement proper error boundaries
- Use TypeScript-style prop validation where applicable

### Database
- Use PostgreSQL with Sequelize ORM
- Include proper indexes for performance
- Use JSONB for complex data structures
- Include proper foreign key relationships
- Use migrations for schema changes

### Testing
- Write comprehensive Jest unit tests for both frontend and backend
- Include Playwright e2e tests for critical user flows
- Mock external dependencies properly
- Test error scenarios and edge cases
- Maintain good test coverage

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication and authorization
- Include security headers
- Sanitize output data
- Use environment variables for sensitive data

## Architecture Patterns

### Backend Patterns
- Use service layer pattern for business logic
- Implement repository pattern for data access
- Use middleware for cross-cutting concerns
- Implement proper error handling hierarchy
- Use dependency injection where appropriate

### Frontend Patterns
- Use custom hooks for reusable logic
- Implement proper component hierarchy
- Use context providers for global state
- Implement proper loading and error states
- Use compound components for complex UI

### API Design
- Follow RESTful principles
- Use consistent response formats
- Implement proper HTTP status codes
- Include pagination for list endpoints
- Use proper versioning strategy

## File Organization

### Backend Structure
```
backend/
├── src/
│   ├── config/        # Configuration files
│   ├── models/        # Sequelize models
│   ├── routes/        # Express routes
│   ├── services/      # Business logic
│   ├── middleware/    # Express middleware
│   └── index.js       # Main application
└── __tests__/         # Jest tests
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── hooks/         # Custom hooks
│   └── utils/         # Utility functions
├── e2e/              # Playwright tests
└── __tests__/        # Jest tests
```

## Common Patterns to Use

### Error Handling
```javascript
// Backend
try {
  const result = await service.doSomething();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed:', error);
  res.status(500).json({ success: false, message: error.message });
}

// Frontend
const { data, isLoading, error } = useQuery(['key'], fetchData);
if (error) return <ErrorComponent error={error} />;
```

### Component Structure
```javascript
// React Component
import React from 'react';
import { SomeIcon } from 'lucide-react';

const ComponentName = ({ prop1, prop2 }) => {
  // Hooks
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = () => {};
  
  // Effects
  useEffect(() => {}, []);
  
  // Render conditions
  if (loading) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className="tailwind-classes">
      <SomeIcon className="h-5 w-5" />
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

### API Service Pattern
```javascript
// API Service
import api from './api';

export const entityAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/endpoint', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/endpoint/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/endpoint', data);
    return response.data;
  }
};
```

## Integration Patterns

### Jira API Integration
- Use axios for HTTP requests
- Implement proper error handling for Jira API responses
- Use basic auth with email and API token
- Handle rate limiting and retry logic
- Cache responses appropriately

### Database Integration
- Use Sequelize for all database operations
- Implement proper model associations
- Use transactions for multi-table operations
- Include proper validation at model level
- Use migrations for schema changes

## Performance Considerations
- Implement proper caching strategies
- Use pagination for large datasets
- Optimize database queries with proper indexes
- Use React.memo for expensive components
- Implement proper loading states
- Use compression for API responses

## Development Workflow
- Use feature branches for development
- Write tests before implementing features
- Include proper documentation for APIs
- Use TypeScript-style JSDoc comments
- Run linting and formatting tools
- Include proper commit messages
