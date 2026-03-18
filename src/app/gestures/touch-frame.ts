import { TouchPoint } from "@shared/model/touch-point";

export interface TouchFrame {
    timeMs: number;
    points: TouchPoint[];
}

