import { GestureRecognizer } from "../gesture-recognizer";
import { GestureState } from "../gesture-state";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../touch-frame";

// Detects left-to-right swipe gestures from a single touch history.

export class SwipeLeftRightRecognizer implements GestureRecognizer {
  name = 'swipe';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Thresholds for a valid left-to-right swipe (normalized coords).
  private readonly maxDurationMs = 3500;
  private readonly maxVerticalDelta = 0.2;
  private readonly minHorizontalDelta = 0.2;
  private readonly cooldownMs = 1000;

  update(frame: TouchFrame, state: GestureState): GestureEvent[] {
    // Wait for touch release so the same swipe doesn't fire repeatedly.
    if (this.activeTouchId !== null && !state.histories.has(this.activeTouchId)) {
      this.activeTouchId = null;
    }
    if (this.activeTouchId !== null) return [];
    if (frame.timeMs < this.cooldownUntil) return [];
    if (state.histories.size !== 1) return [];

    const history = Array.from(state.histories.values())[0];
    if (history.samples.length < 3) return [];

    // Compare first and last samples to detect a quick horizontal movement.
    const first = history.samples[0];
    const last = history.samples[history.samples.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dtMs = (last.timeMs - first.timeMs);

    if (dtMs > this.maxDurationMs) return []; // too slow
    if (Math.abs(dy) > this.maxVerticalDelta) return []; // not horizontal
    if (dx < this.minHorizontalDelta) return []; // not left-to-right

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'swipe-left-right',
      timeMs: frame.timeMs,
      payload: { dx, dy, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }
}
