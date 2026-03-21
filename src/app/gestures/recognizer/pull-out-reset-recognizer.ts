// Detects a depth pull-out followed by a quick reset to z ~= 0.
import { GestureRecognizer } from "../gesture-recognizer";
import { GestureState } from "../gesture-state";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../touch-frame";

export class PullOutResetRecognizer implements GestureRecognizer {
  name = 'pull-out-reset';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Depth thresholds (normalized Z in [0, 1])
  private readonly minDepth = 0.1;
  private readonly maxZero = 0.05;
  private readonly minHoldMs = 120;
  private readonly maxResetMs = 350;
  private readonly cooldownMs = 800;

  update(frame: TouchFrame, state: GestureState): GestureEvent[] {
    // Wait for touch release so the same gesture doesn't fire repeatedly.
    if (this.activeTouchId !== null && !state.histories.has(this.activeTouchId)) {
      this.activeTouchId = null;
    }
    if (this.activeTouchId !== null) return [];
    if (frame.timeMs < this.cooldownUntil) return [];
    if (state.histories.size !== 1) return [];

    const history = Array.from(state.histories.values())[0];
    if (history.samples.length < 4) return [];

    const last = history.samples[history.samples.length - 1];
    if (!Number.isFinite(last.z)) return [];
    if (Math.abs(last.z) > this.maxZero) return []; // not reset to zero yet

    let firstDepthSample = null as null | typeof last;
    let lastDepthSample = null as null | typeof last;

    for (const sample of history.samples) {
      if (!Number.isFinite(sample.z)) continue;
      if (sample.z < 0 || sample.z > 1) continue;
      if (sample.z >= this.minDepth) {
        if (!firstDepthSample) firstDepthSample = sample;
        lastDepthSample = sample;
      }
    }

    if (!firstDepthSample || !lastDepthSample) return [];

    const holdDuration = last.timeMs - firstDepthSample.timeMs;
    if (holdDuration < this.minHoldMs) return [];

    const resetDuration = last.timeMs - lastDepthSample.timeMs;
    if (resetDuration > this.maxResetMs) return [];

    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'pull-out-reset',
      timeMs: frame.timeMs,
      payload: {
        zPeak: lastDepthSample.z,
        holdDuration,
        resetDuration
      }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }
}
