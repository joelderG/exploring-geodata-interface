import { TouchFrame } from "@shared/interface/touch-frame";

// Shared state for recognizers: per-touch history and last frame.

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

export interface GestureStateInterface {
    histories: Map<number, TouchHistory>;
    lastFrame?: TouchFrame;
}
