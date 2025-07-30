/**
 * Utility functions for handling numeric values and preventing NaN/null issues in the frontend
 */

/**
 * Ensures a numeric value is safe (not NaN, not infinite)
 * Returns defaultValue if the value is NaN or not finite
 */
export function ensureSafeNumeric(value: number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Safely parses a string/number to a numeric value
 * Returns defaultValue if the value cannot be parsed or is NaN
 */
export function safeParseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return ensureSafeNumeric(parsed, defaultValue);
}

/**
 * Safely formats a number with specified decimal places
 * Returns formatted string with defaultValue if the input is NaN
 */
export function safeFormatNumber(value: string | number | null | undefined, decimals: number = 1, defaultValue: number = 0): string {
  const safeValue = safeParseFloat(value, defaultValue);
  return safeValue.toFixed(decimals);
}

/**
 * Safely formats a percentage value
 * Returns formatted string with '%' suffix, using defaultValue if input is NaN
 */
export function safeFormatPercentage(value: string | number | null | undefined, decimals: number = 1, defaultValue: number = 0): string {
  return `${safeFormatNumber(value, decimals, defaultValue)}%`;
}

/**
 * Checks if a numeric value is considered safe and valid (not NaN, not null/undefined)
 */
export function isValidNumeric(value: any): boolean {
  return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
}
