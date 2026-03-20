import { GestureState } from "./gesture-state";
import { GestureEvent } from "./gesture-types";
import { TouchFrame } from "./touch-frame";

// Contract for gesture recognizers to inspect frames and emit events

export interface GestureRecognizer {
    // Recognizer name (for logging/debugging).
    name: string;
    // Called for each frame; returns zero or more gesture events.
    update(frame: TouchFrame, state: GestureState): GestureEvent[];
    // Resets internal recognizer state (cooldowns, touch tracking).
    reset(): void;
}
