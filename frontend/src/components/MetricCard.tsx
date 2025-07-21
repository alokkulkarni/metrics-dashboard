import React from 'react'
import MetricTooltip from './MetricTooltip'
import { METRIC_DEFINITIONS, MetricKey } from '../constants/metricDefinitions'

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: React.ReactNode
  className?: string
  metricKey?: MetricKey
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  className = '',
  metricKey
}) => {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      case 'neutral':
      default:
        return 'text-gray-500'
    }
  }

  const getChangeSymbol = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return '+'
      case 'decrease':
        return '-'
      case 'neutral':
      default:
        return ''
    }
  }

  return (
    <div className={`metric-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="metric-label">{title}</p>
            {metricKey && METRIC_DEFINITIONS[metricKey] && (
              <MetricTooltip
                title={METRIC_DEFINITIONS[metricKey].title}
                definition={METRIC_DEFINITIONS[metricKey].definition}
                calculation={METRIC_DEFINITIONS[metricKey].calculation}
                example={METRIC_DEFINITIONS[metricKey].example}
              />
            )}
          </div>
          <p className="metric-value">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${getChangeColor(change.type)}`}>
              {getChangeSymbol(change.type)}{Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default MetricCard
