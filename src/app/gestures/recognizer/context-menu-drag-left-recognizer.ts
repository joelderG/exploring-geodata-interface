// Detects leftward drag gestures on the secondary touch point (context menu).
import { GestureRecognizer } from "../gesture-recognizer";
import { GestureState } from "../gesture-state";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../touch-frame";
import { TouchPoint } from "@shared/model/touch-point";

export class ContextMenuDragLeftRecognizer implements GestureRecognizer {
  name = 'context-menu-drag-left';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Thresholds for a valid leftward drag (normalized coords).
  private readonly maxDurationMs = 6000;
  private readonly maxVerticalDelta = 0.25;
  private readonly minHorizontalDelta = 0.15;
  private readonly cooldownMs = 500;

  update(frame: TouchFrame, state: GestureState): GestureEvent[] {
    // Wait for touch release so the same drag doesn't fire repeatedly.
    if (this.activeTouchId !== null && !state.histories.has(this.activeTouchId)) {
      this.activeTouchId = null;
    }
    if (this.activeTouchId !== null) return [];
    if (frame.timeMs < this.cooldownUntil) return [];
    if (frame.points.length < 2) return [];

    const secondary = this.findSecondaryDeepPoint(frame.points);
    if (!secondary) return [];

    const history = state.histories.get(secondary.TouchId);
    if (!history || history.samples.length < 3) return [];

    const first = history.samples[0];
    const last = history.samples[history.samples.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dtMs = (last.timeMs - first.timeMs);

    if (dtMs > this.maxDurationMs) return []; // too slow
    if (Math.abs(dy) > this.maxVerticalDelta) return []; // not horizontal
    if (dx > -this.minHorizontalDelta) return []; // not leftward

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: 'context-drag-left',
      timeMs: frame.timeMs,
      payload: { dx, dy, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }

  private findSecondaryDeepPoint(points: TouchPoint[]): TouchPoint | null {
    const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
    if (candidates.length < 2) return null;

    const deepest = candidates.reduce((best, current) => {
      const bestDepth = this.getDepthMagnitude(best);
      const currentDepth = this.getDepthMagnitude(current);
      return currentDepth > bestDepth ? current : best;
    }, candidates[0]);

    let second: TouchPoint | null = null;
    let secondDepth = -Infinity;

    for (const candidate of candidates) {
      if (candidate.TouchId === deepest.TouchId) continue;
      const depth = this.getDepthMagnitude(candidate);
      if (!Number.isFinite(depth)) continue;
      if (depth > secondDepth) {
        secondDepth = depth;
        second = candidate;
      }
    }
    return second;
  }

  private getDepthMagnitude(point: TouchPoint | null | undefined): number {
    const z = point?.Position?.Z;
    if (z === undefined) return NaN;
    if (!Number.isFinite(z)) return NaN;
    return z < 0 ? -z : z;
  }
}
