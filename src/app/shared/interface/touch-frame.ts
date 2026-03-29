import { TouchPoint } from "@shared/model/touch-point";

// Normalized touchpoints snapshot at a moment in time

export interface TouchFrame {
    timeMs: number;
    points: TouchPoint[];
}
