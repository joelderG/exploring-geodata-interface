export type GestureType =
    | 'swipe-left-right'
    | 'swipe-right-left'
    | 'swipe-top-bottom'
    | 'context-drag-left'
    | 'context-drag-right';

// Gesture event types emitted by recognizers

export interface GestureEvent {
    type: GestureType;
    timeMs: number;
    payload?: Record<string, unknown>;
}
