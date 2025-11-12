/**
 * Formats a timestamp to "Nov 13 2025, 15:45 (GMT+7)" format using Asia/Bangkok timezone
 * @param timestamp - ISO timestamp string
 * @returns Formatted date string with GMT+7 timezone
 */
export function formatMessageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  
  const formatted = date.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  // Format: "Nov 13, 2025, 15:45" -> "Nov 13 2025, 15:45"
  const parts = formatted.split(', ');
  if (parts.length === 3) {
    const [monthDay, year, time] = parts;
    return `${monthDay} ${year}, ${time} (GMT+7)`;
  }
  
  return `${formatted} (GMT+7)`;
}

/**
 * Formats a timestamp with admin name: "Replied by: [Full Name] · Nov 13 2025, 15:45 (GMT+7)"
 * @param timestamp - ISO timestamp string
 * @param adminName - Admin's full name (optional)
 * @returns Formatted date string with admin name
 */
export function formatMessageTimestampWithName(timestamp: string, adminName?: string | null): string {
  const dateStr = formatMessageTimestamp(timestamp);
  if (adminName) {
    return `Replied by: ${adminName} · ${dateStr}`;
  }
  return dateStr;
}

