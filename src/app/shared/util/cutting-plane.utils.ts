import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { VolumeCoordinates } from '@shared/interface/volume-coordinates';

export function ensureSliceIndexInBounds(index: number, coordinates: VolumeCoordinates, orientation: CuttingPlaneOrientation) {
  const axisLength = getAxisLengthForOrientation(orientation, coordinates);
  const maxIndex = Math.max(axisLength - 1, 0);
  return Math.min(Math.max(index, 0), maxIndex);
}

export function getAxisLengthForOrientation(orientation: CuttingPlaneOrientation, coordinates: VolumeCoordinates): number {
  switch (orientation) {
  case CuttingPlaneOrientation.XZ:
    return coordinates.yCoordinates.length;
  case CuttingPlaneOrientation.YZ:
    return coordinates.xCoordinates.length;
  case CuttingPlaneOrientation.XY:
  default:
    return coordinates.zCoordinates.length;
  }
}

export function getAxisCoordinatesForOrientation(
  orientation: CuttingPlaneOrientation,
  coordinates: VolumeCoordinates
): number[] {
  switch (orientation) {
  case CuttingPlaneOrientation.XZ:
    return coordinates.yCoordinates;
  case CuttingPlaneOrientation.YZ:
    return coordinates.xCoordinates;
  case CuttingPlaneOrientation.XY:
  default:
    return coordinates.zCoordinates;
  }
}

export function getInitialSliceIndexForOrientation(
  orientation: CuttingPlaneOrientation,
  coordinates: VolumeCoordinates
): number {
  const axisCoords = getAxisCoordinatesForOrientation(orientation, coordinates);
  if (axisCoords.length === 0) return 0;

  const prefersMax = orientation === CuttingPlaneOrientation.XY;
  let bestIndex = -1;
  let bestValue = prefersMax ? -Infinity : Infinity;

  for (let i = 0; i < axisCoords.length; i++) {
    const value = axisCoords[i];
    if (!Number.isFinite(value)) continue;
    if (prefersMax ? value > bestValue : value < bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }

  return bestIndex >= 0 ? bestIndex : 0;
}

export function normalizedZToSliceIndex(
  zNormalized: number,
  orientation: CuttingPlaneOrientation,
  coordinates: VolumeCoordinates
): number | null {
  if (!Number.isFinite(zNormalized)) return null;
  const axisCoords = getAxisCoordinatesForOrientation(orientation, coordinates);
  if (axisCoords.length === 0) return null;

  // Depth interaction is only in [-1, 0]. Positive values are reserved for pull-out.
  if (zNormalized > 0) return null;
  // Map [-1, 0] -> [1, 0] depth magnitude, then clamp to [0, 1].
  const normalizedDepth = -zNormalized;
  const clamped = Math.min(Math.max(normalizedDepth, 0), 1);

  let min = Infinity;
  let max = -Infinity;
  for (const value of axisCoords) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  if (min === max) {
    const firstFiniteIndex = axisCoords.findIndex((value) => Number.isFinite(value));
    return firstFiniteIndex >= 0 ? firstFiniteIndex : null;
  }

  // z=0 -> start (min), z=-1 -> end (max).
  // For XY we invert so depth pulls move "down" the volume.
  const normalized = orientation === CuttingPlaneOrientation.XY ? 1 - clamped : clamped;
  const targetValue = min + normalized * (max - min);
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < axisCoords.length; i++) {
    const value = axisCoords[i];
    if (!Number.isFinite(value)) continue;
    const distance = Math.abs(value - targetValue);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex >= 0 ? bestIndex : null;
}
