/**
 * Sanitize a string for use in filenames
 * Replaces non-alphanumeric characters with hyphens and limits length
 */
export function sanitizeFilename(title: string, maxLength: number = 50): string {
  return title
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength) || 'research-report';
}

