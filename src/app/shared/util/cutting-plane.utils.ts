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

export function normalizedZToSliceIndex(zNormalized: number, axisLength: number): number | null {
  if (!Number.isFinite(zNormalized) || axisLength <= 0) return null;
  const clamped = Math.min(Math.max(zNormalized, 0), 1);
  const maxIndex = axisLength - 1;
  return Math.round(clamped * maxIndex);
}
