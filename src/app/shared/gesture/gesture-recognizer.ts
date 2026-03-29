import { GestureStateInterface } from "../interface/gestureState.interface";
import { GestureEvent } from "./gesture-types";
import { TouchFrame } from "../interface/touch-frame";

// Contract for gesture recognizers to inspect frames and emit events

export interface GestureRecognizer {
    // Recognizer name (for logging/debugging).
    name: string;
    // Called for each frame; returns zero or more gesture events.
    update(frame: TouchFrame, state: GestureStateInterface): GestureEvent[];
    // Resets internal gesture state (cooldowns, touch tracking).
    reset(): void;
}
