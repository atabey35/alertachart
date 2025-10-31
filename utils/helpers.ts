/**
 * Helper Utilities - Based on aggr.trade
 */

/**
 * Floor timestamp to timeframe bucket
 */
export function floorTimestampToTimeframe(timestamp: number, timeframe: number): number {
  return Math.floor(timestamp / (timeframe * 1000)) * (timeframe * 1000);
}

/**
 * Get timeframe in human-readable format
 */
export function getTimeframeForHuman(timeframe: number): string {
  if (timeframe < 60) {
    return `${timeframe}s`;
  } else if (timeframe < 3600) {
    return `${timeframe / 60}m`;
  } else if (timeframe < 86400) {
    return `${timeframe / 3600}h`;
  } else {
    return `${timeframe / 86400}d`;
  }
}

/**
 * Check if timeframe is odd (not standard)
 */
export function isOddTimeframe(timeframe: number): boolean {
  const standardTimeframes = [10, 30, 60, 300, 900, 3600, 14400, 86400];
  return !standardTimeframes.includes(timeframe);
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Camelize string (snake_case to camelCase)
 */
export function camelize(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Get HH:MM:SS from timestamp
 */
export function getHms(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Handle fetch errors
 */
export function handleFetchError(error: Error): void {
  console.error('[Fetch Error]', error.message);
}

