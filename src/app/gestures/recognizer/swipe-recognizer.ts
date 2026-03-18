import { GestureRecognizer } from "../gesture-recognizer";
import { GestureState } from "../gesture-state";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../touch-frame";

export class SwipeRecognizer implements GestureRecognizer {
  name = 'swipe';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  private readonly maxDurationMs = 350;
  private readonly minDistance = 0.18;
  private readonly maxVerticalDelta = 0.12;
  private readonly minHorizontalDelta = 0.16;
  private readonly cooldownMs = 400;

  update(frame: TouchFrame, state: GestureState): GestureEvent[] {
    if (this.activeTouchId !== null && !state.histories.has(this.activeTouchId)) {
      this.activeTouchId = null;
    }
    if (this.activeTouchId !== null) return [];
    if (frame.timeMs < this.cooldownUntil) return [];
    if (state.histories.size !== 1) return [];

    const history = Array.from(state.histories.values())[0];
    if (history.samples.length < 3) return [];

    const first = history.samples[0];
    const last = history.samples[history.samples.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = last.timeMs - first.timeMs;

    if (dt > this.maxDurationMs) return []; // too slow
    const dist = Math.hypot(dx, dy);
    if (dist < this.minDistance) return []; // too short
    if (Math.abs(dy) > this.maxVerticalDelta) return []; // not horizontal
    if (dx < this.minHorizontalDelta) return []; // not left-to-right

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'swipe-left-right',
      timeMs: frame.timeMs,
      payload: { dx, dy, dist, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }
}
