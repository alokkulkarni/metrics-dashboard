import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Grid3X3, Users, Activity } from 'lucide-react'
import ApplicationStatus from './ApplicationStatus'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Boards', href: '/boards', icon: Grid3X3 },
    { name: 'Resource Spread', href: '/resource-spread', icon: Users },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">Metrics Dashboard</h1>
          </div>
        </div>
        
        <nav className="mt-8 px-3 flex-1">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`
                      group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                      ${isActive(item.href)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon 
                      className={`
                        mr-3 h-5 w-5 transition-colors
                        ${isActive(item.href)
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                        }
                      `}
                    />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        
        {/* Application Status at bottom */}
        <div className="p-3 border-t border-gray-200">
          <ApplicationStatus />
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
