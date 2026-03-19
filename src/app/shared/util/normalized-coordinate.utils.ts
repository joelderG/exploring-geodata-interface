export interface NormalizedIndexResult {
  index: number;
  value: number;
}

export type NormalizedRange = 'unsigned' | 'signed' | 'depth' | 'autoSigned';

function normalizeToUnitInterval(
  value: number,
  range: NormalizedRange
): number | null {
  if (!Number.isFinite(value)) return null;
  switch (range) {
  case 'signed': {
    return clamp01((value + 1) / 2);
  }
  case 'depth': {
    return clamp01(Math.abs(value));
  }
  case 'autoSigned': {
    const normalized = value < 0 ? (value + 1) / 2 : value;
    return clamp01(normalized);
  }
  case 'unsigned':
  default:
    return clamp01(value);
  }
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function normalizedToCoordinateIndex(
  normalized: number,
  coordinates: number[],
  options: { invert?: boolean; range?: NormalizedRange } = {}
): NormalizedIndexResult | null {
  if (!Number.isFinite(normalized) || coordinates.length === 0) {
    return null;
  }

  const range = options.range ?? 'unsigned';
  const normalizedValue = normalizeToUnitInterval(normalized, range);
  if (normalizedValue === null) return null;
  const invert = options.invert ?? false;
  const normalizedClamped = invert ? 1 - normalizedValue : normalizedValue;

  let min = Infinity;
  let max = -Infinity;
  for (const value of coordinates) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  if (min === max) {
    const firstFiniteIndex = coordinates.findIndex((value) => Number.isFinite(value));
    if (firstFiniteIndex < 0) return null;
    return { index: firstFiniteIndex, value: coordinates[firstFiniteIndex] };
  }

  const targetValue = min + normalizedClamped * (max - min);
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const value = coordinates[i];
    if (!Number.isFinite(value)) continue;
    const distance = Math.abs(value - targetValue);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) return null;
  return { index: bestIndex, value: coordinates[bestIndex] };
}

export function normalizedToDisplayPosition(
  normalized: number,
  size: number,
  options: { invert?: boolean; range?: NormalizedRange } = {}
): number | null {
  if (!Number.isFinite(normalized) || !Number.isFinite(size) || size <= 0) {
    return null;
  }

  const range = options.range ?? 'unsigned';
  const normalizedValue = normalizeToUnitInterval(normalized, range);
  if (normalizedValue === null) return null;
  const invert = options.invert ?? false;
  const clamped = invert ? 1 - normalizedValue : normalizedValue;
  return clamped * size;
}
