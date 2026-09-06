/**
 * Formatting that does not depend on where it runs.
 *
 * This page is server-rendered and then hydrated, so anything derived from the
 * client's clock or locale renders differently on the two sides and React
 * discards the markup. Every function here takes its "now" as an argument and
 * formats in UTC.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "5 September 2026, 23:47 UTC" — unambiguous and locale-free. */
export function formatAbsolute(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/** "just now", "4 minutes ago", "2 hours ago", "3 days ago". */
export function formatAge(epochSeconds: number, nowSeconds: number): string {
  const seconds = Math.max(0, nowSeconds - epochSeconds);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "48 seconds", "6 minutes", "2 hours 5 minutes". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const head = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest === 0 ? head : `${head} ${rest} minute${rest === 1 ? '' : 's'}`;
}

/**
 * Two decimal places, and never rounded up to a clean 100%.
 *
 * An outage that lasted a minute over ninety days is 99.9992%, and printing
 * that as "100%" tells a reader the opposite of what the incident list below
 * it says.
 */
export function formatUptime(fraction: number): string {
  const percent = fraction * 100;
  if (fraction < 1 && percent > 99.99) return '99.99%';
  return `${percent.toFixed(2)}%`;
}
