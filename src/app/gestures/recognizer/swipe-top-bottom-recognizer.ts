// Detects top-to-bottom swipe gestures from a single touch history.
import { GestureRecognizer } from "../gesture-recognizer";
import { GestureState } from "../gesture-state";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../touch-frame";

export class SwipeTopBottomRecognizer implements GestureRecognizer {
  name = 'swipe-top-bottom';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Thresholds for a valid top-to-bottom swipe (normalized coords).
  private readonly maxDurationMs = 350;
  private readonly minDistance = 0.18;
  private readonly maxHorizontalDelta = 0.12;
  private readonly minVerticalDelta = 0.16;
  private readonly cooldownMs = 400;

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

    // Compare first and last samples to detect a quick vertical movement.
    const first = history.samples[0];
    const last = history.samples[history.samples.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = last.timeMs - first.timeMs;

    if (dt > this.maxDurationMs) return []; // too slow
    const dist = Math.hypot(dx, dy);
    if (dist < this.minDistance) return []; // too short
    if (Math.abs(dx) > this.maxHorizontalDelta) return []; // not vertical
    if (dy < this.minVerticalDelta) return []; // not top-to-bottom

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'swipe-top-bottom',
      timeMs: frame.timeMs,
      payload: { dx, dy, dist, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }
}
