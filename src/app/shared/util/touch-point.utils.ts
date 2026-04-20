import { TouchPoint } from '@shared/model/touch-point';

export function getDepthMagnitude(point: TouchPoint | null | undefined): number {
  const z = point?.Position?.Z;
  if (z === undefined) return NaN;
  if (!Number.isFinite(z)) return NaN;
  return z < 0 ? -z : z;
}

export function getDeepestPoint(points: TouchPoint[]): TouchPoint | null {
  const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((deepest, current) => {
    const deepestDepth = getDepthMagnitude(deepest);
    const currentDepth = getDepthMagnitude(current);
    return currentDepth > deepestDepth ? current : deepest;
  }, candidates[0]);
}

export function getSecondaryDeepPoint(points: TouchPoint[], deepest?: TouchPoint | null): TouchPoint | null {
  const resolvedDeepest = deepest ?? getDeepestPoint(points);
  if (!resolvedDeepest) {
    return null;
  }

  const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
  if (candidates.length < 2) {
    return null;
  }

  let second: TouchPoint | null = null;
  let secondDepth = -Infinity;

  for (const candidate of candidates) {
    if (candidate.TouchId === resolvedDeepest.TouchId) continue;
    const depth = getDepthMagnitude(candidate);
    if (!Number.isFinite(depth)) continue;
    if (depth > secondDepth) {
      secondDepth = depth;
      second = candidate;
    }
  }
  return second;
}
