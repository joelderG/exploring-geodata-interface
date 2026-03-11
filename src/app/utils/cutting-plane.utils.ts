import { CuttingPlaneOrientation } from "@shared/enum/cutting-plane-orientation";
import { VolumeCoordinates } from "@shared/interface/sammlung-joel";

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