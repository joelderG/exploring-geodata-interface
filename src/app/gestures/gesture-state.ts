import { TouchFrame } from "./touch-frame";

export interface TouchSample {
    x: number;
    y: number;
    z: number;
    timeMs: number;
}

export interface TouchHistory {
    id: number;
    samples: TouchSample[];
    lastSeenMs: number;
}

export interface GestureState {
    histories: Map<number, TouchHistory>;
    lastFrame?: TouchFrame;
}