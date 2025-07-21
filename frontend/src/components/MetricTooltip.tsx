import React, { useState } from 'react'
import { Info, X } from 'lucide-react'

interface MetricTooltipProps {
  title: string
  definition: string
  calculation: string
  example?: string
  className?: string
}

const MetricTooltip: React.FC<MetricTooltipProps> = ({ 
  title, 
  definition, 
  calculation, 
  example,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-gray-400 hover:text-gray-600 transition-colors duration-200 ${className}`}
        aria-label={`Information about ${title}`}
      >
        <Info className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Tooltip */}
          <div className="absolute z-50 w-80 p-4 bg-white rounded-lg shadow-lg border border-gray-200 -top-2 left-6 transform">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close metric information"
                title="Close metric information"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Definition</h4>
                <p className="text-sm text-gray-600">{definition}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Calculation</h4>
                <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border">
                  {calculation}
                </p>
              </div>
              
              {example && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Example</h4>
                  <p className="text-sm text-gray-600">{example}</p>
                </div>
              )}
            </div>
            
            {/* Arrow */}
            <div className="absolute top-3 -left-2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
          </div>
        </>
      )}
    </div>
  )
}

export default MetricTooltip
