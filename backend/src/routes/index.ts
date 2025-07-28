import { Router } from 'express';
import projectRoutes from './projects';
import boardRoutes from './boards';
import sprintRoutes from './sprints';
import issueRoutes from './issues';
import metricRoutes from './metrics';
import syncRoutes from './sync';
import kanbanMetricsRoutes from './kanbanMetrics';
import resourceRoutes from './resources';

const router = Router();

// Mount all routes
router.use('/projects', projectRoutes);
router.use('/boards', boardRoutes);
router.use('/sprints', sprintRoutes);
router.use('/issues', issueRoutes);
router.use('/metrics', metricRoutes);
router.use('/sync', syncRoutes);
router.use('/kanban-metrics', kanbanMetricsRoutes);
router.use('/resources', resourceRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Metrics Dashboard API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
