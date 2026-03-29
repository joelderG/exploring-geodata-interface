// Detects top-to-bottom swipe gestures from a single touch history.
import { GestureRecognizer } from "../gesture-recognizer";
import { GestureStateInterface } from "../../interface/gestureState.interface";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../../interface/touch-frame";
import { gestureConfig } from "../gesture-config";

export class SwipeVerticalRecognizer implements GestureRecognizer {
  name = 'swipe-vertical';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Thresholds for a valid top-to-bottom swipe (normalized coords).
  private readonly maxDurationMs = gestureConfig.swipeVertical.maxDurationMs;
  private readonly maxHorizontalDelta = gestureConfig.swipeVertical.maxHorizontalDelta;
  private readonly minVerticalDelta = gestureConfig.swipeVertical.minVerticalDelta;
  private readonly cooldownMs = gestureConfig.swipeVertical.cooldownMs;

  update(frame: TouchFrame, state: GestureStateInterface): GestureEvent[] {
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
    const dt = (last.timeMs - first.timeMs);

    if (dt > this.maxDurationMs) return []; // too slow
    if (Math.abs(dx) > this.maxHorizontalDelta) return []; // not vertical
    if (dy < this.minVerticalDelta) return []; // not top-to-bottom

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'swipe-top-bottom',
      timeMs: frame.timeMs,
      payload: { dx, dy, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }
}
