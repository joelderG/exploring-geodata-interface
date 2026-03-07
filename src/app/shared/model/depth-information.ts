import { TouchPoint } from "./touch-point";

export interface DepthInformation{
    layer: number;
    inLayerDepth: number;
    deadzone : number;
    point: TouchPoint;
}
