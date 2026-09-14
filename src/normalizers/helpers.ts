export function toIsoTimestamp(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }

  const normalizedValue =
    typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

export function normalizeBranch(value?: string | null): string {
  if (!value) {
    return 'unknown';
  }

  return value.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
}

export function coerceString(value: unknown, fallback = 'unknown'): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return fallback;
}
