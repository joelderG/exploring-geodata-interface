import { CuttingPlaneOrientation } from "@shared/enum/cutting-plane-orientation";

export interface SliceRenderData {
  data: number[][];
  axisValue: number;
  xCoords: number[];
  yCoords: number[];
  orientation: CuttingPlaneOrientation;
}