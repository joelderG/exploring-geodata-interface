import { Volume } from '@services/api/api.types';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

export interface SliceIndexRange {
  min: number;
  max: number;
}

export function getValidSliceRange(
  volume: Volume,
  orientation: CuttingPlaneOrientation,
  noDataClass = -1
): SliceIndexRange {
  const axisLength = getVolumeAxisLengthForOrientation(volume, orientation);
  if (axisLength === 0) return { min: 0, max: 0 };

  let min = -1;
  let max = -1;
  for (let i = 0; i < axisLength; i++) {
    if (!sliceHasData(volume, orientation, i, noDataClass)) continue;
    if (min < 0) min = i;
    max = i;
  }

  return {
    min: min >= 0 ? min : 0,
    max: max >= 0 ? max : Math.max(axisLength - 1, 0)
  };
}

export function getVolumeAxisLengthForOrientation(volume: Volume, orientation: CuttingPlaneOrientation): number {
  switch (orientation) {
  case CuttingPlaneOrientation.XZ:
    return volume.data[0]?.length ?? 0;
  case CuttingPlaneOrientation.YZ:
    return volume.data[0]?.[0]?.length ?? 0;
  case CuttingPlaneOrientation.XY:
  default:
    return volume.data.length;
  }
}

function sliceHasData(
  volume: Volume,
  orientation: CuttingPlaneOrientation,
  index: number,
  noDataClass: number
): boolean {
  const zLen = volume.data.length;
  const yLen = volume.data[0]?.length ?? 0;
  const xLen = volume.data[0]?.[0]?.length ?? 0;
  if (zLen === 0 || yLen === 0 || xLen === 0) return false;

  switch (orientation) {
  case CuttingPlaneOrientation.XZ: {
    const safeYIndex = Math.min(Math.max(index, 0), Math.max(yLen - 1, 0));
    for (let iz = 0; iz < zLen; iz++) {
      const row = volume.data[iz][safeYIndex];
      for (let ix = 0; ix < xLen; ix++) {
        if (row[ix] !== noDataClass) return true;
      }
    }
    return false;
  }
  case CuttingPlaneOrientation.YZ: {
    const safeXIndex = Math.min(Math.max(index, 0), Math.max(xLen - 1, 0));
    for (let iz = 0; iz < zLen; iz++) {
      const plane = volume.data[iz];
      for (let iy = 0; iy < yLen; iy++) {
        if (plane[iy][safeXIndex] !== noDataClass) return true;
      }
    }
    return false;
  }
  case CuttingPlaneOrientation.XY:
  default: {
    const safeZIndex = Math.min(Math.max(index, 0), Math.max(zLen - 1, 0));
    const plane = volume.data[safeZIndex];
    for (let iy = 0; iy < yLen; iy++) {
      const row = plane[iy];
      for (let ix = 0; ix < xLen; ix++) {
        if (row[ix] !== noDataClass) return true;
      }
    }
    return false;
  }
  }
}
