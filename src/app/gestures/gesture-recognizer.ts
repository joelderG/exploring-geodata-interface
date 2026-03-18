import { GestureState } from "./gesture-state";
import { GestureEvent } from "./gesture-types";
import { TouchFrame } from "./touch-frame";

export interface GestureRecognizer {
    name: string;
    update(frame: TouchFrame, state: GestureState): GestureEvent[];
    reset(): void;
}