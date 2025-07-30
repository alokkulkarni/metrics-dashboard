/**
 * Utility functions for handling numeric values and preventing NaN/null issues
 */

/**
 * Ensures a numeric value is safe (not NaN, not infinite)
 * Returns 0 if the value is NaN or not finite
 */
export function ensureSafeNumeric(value: number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Safely parses a string/number to a numeric value
 * Returns 0 if the value cannot be parsed or is NaN
 */
export function safeParseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return ensureSafeNumeric(parsed, defaultValue);
}

/**
 * Safely calculates a percentage (numerator / denominator * 100)
 * Returns 0 if denominator is 0 or result is NaN
 */
export function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return 0;
  }
  
  const result = (numerator / denominator) * 100;
  return ensureSafeNumeric(result);
}

/**
 * Safely calculates an average
 * Returns 0 if the array is empty or sum is NaN
 */
export function safeAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((acc, val) => acc + ensureSafeNumeric(val), 0);
  return ensureSafeNumeric(sum / values.length);
}

/**
 * Rounds a number to a specified number of decimal places
 * Returns 0 if the value is NaN
 */
export function safeRound(value: number, decimals: number = 2): number {
  const safeValue = ensureSafeNumeric(value);
  const multiplier = Math.pow(10, decimals);
  return Math.round(safeValue * multiplier) / multiplier;
}
