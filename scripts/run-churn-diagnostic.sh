#!/bin/bash

# Script to run churn metrics diagnostic via Docker Compose
echo "🔍 Running Churn Metrics Diagnostic..."

# Run the diagnostic script inside the backend container
docker-compose exec backend npx ts-node src/scripts/diagnose-churn-metrics.ts

echo "✅ Diagnostic completed"
