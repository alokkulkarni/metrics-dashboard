import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ServiceStatus {
  service: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastChecked: Date
}

interface HealthCheckResponse {
  services: {
    frontend: ServiceStatus
    backend: ServiceStatus
    database: ServiceStatus
  }
}

const ApplicationStatus: React.FC = () => {
  // Query to check application health status
  const { data: healthStatus, isLoading } = useQuery<HealthCheckResponse>({
    queryKey: ['health-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/health/status')
        if (!response.ok) {
          throw new Error('Health check failed')
        }
        return await response.json()
      } catch (error) {
        // If backend is down, return partial status
        return {
          services: {
            frontend: {
              service: 'frontend',
              status: 'healthy' as const,
              lastChecked: new Date()
            },
            backend: {
              service: 'backend',
              status: 'unhealthy' as const,
              lastChecked: new Date()
            },
            database: {
              service: 'database',
              status: 'unknown' as const,
              lastChecked: new Date()
            }
          }
        }
      }
    },
    refetchInterval: 180000, // Check every 3 minutes for status updates
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to ensure fresh checks
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'unhealthy':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700'
      case 'unhealthy':
        return 'text-red-700'
      default:
        return 'text-yellow-700'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 mb-2">System Status</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  const services = healthStatus?.services || {}

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600 mb-2">System Status</div>
      <div className="space-y-1">
        {Object.entries(services).map(([key, service]) => {
          const serviceData = service as ServiceStatus
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(serviceData.status)}
                <span className="text-xs text-gray-600 capitalize">{serviceData.service}</span>
              </div>
              <span className={`text-xs font-medium ${getStatusColor(serviceData.status)}`}>
                {serviceData.status}
              </span>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}

export default ApplicationStatus
