/**
 * Frontend logging utility
 * Provides consistent logging across the frontend application
 */

interface Logger {
  error: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

class FrontendLogger implements Logger {
  private isDevelopment = import.meta.env.MODE === 'development'
  
  error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, ...args)
  }
  
  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }
  
  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }
  
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }
}

// Create a singleton logger instance
export const logger = new FrontendLogger()

// Export default for convenience
export default logger
