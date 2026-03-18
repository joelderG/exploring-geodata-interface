export type GestureType = 'swipe-left-right' | 'swipe-right-left' | 'swipe-top-bottom' | 'swipe';

export interface GestureEvent {
    type: GestureType;
    timeMs: number;
    payload?: Record<string, unknown>;
}
