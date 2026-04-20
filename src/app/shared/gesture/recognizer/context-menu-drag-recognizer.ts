// Detects left/right drag gestures on the secondary touch point (context menu).
import { GestureRecognizer } from "../gesture-recognizer";
import { GestureStateInterface } from "../../interface/gestureState.interface";
import { GestureEvent } from "../gesture-types";
import { TouchFrame } from "../../interface/touch-frame";
import { gestureConfig } from "../gesture-config";
import { getSecondaryDeepPoint } from "@shared/util/touch-point.utils";

export class ContextMenuDragRecognizer implements GestureRecognizer {
  name = 'context-menu-drag';
  private cooldownUntil = 0;
  private activeTouchId: number | null = null;

  // Thresholds for a valid horizontal drag (normalized coords).
  private readonly maxDurationMs = gestureConfig.contextMenuDrag.maxDurationMs;
  private readonly maxVerticalDelta = gestureConfig.contextMenuDrag.maxVerticalDelta;
  private readonly minHorizontalDelta = gestureConfig.contextMenuDrag.minHorizontalDelta;
  private readonly cooldownMs = gestureConfig.contextMenuDrag.cooldownMs;

  update(frame: TouchFrame, state: GestureStateInterface): GestureEvent[] {
    // Wait for touch release so the same drag doesn't fire repeatedly.
    if (this.activeTouchId !== null && !state.histories.has(this.activeTouchId)) {
      this.activeTouchId = null;
    }
    if (this.activeTouchId !== null) return [];
    if (frame.timeMs < this.cooldownUntil) return [];
    if (frame.points.length < 2) return [];

    const secondary = getSecondaryDeepPoint(frame.points);
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
    if (Math.abs(dx) < this.minHorizontalDelta) return []; // too small

    const angle = Math.atan2(dy, dx);
    this.cooldownUntil = frame.timeMs + this.cooldownMs;
    this.activeTouchId = history.id;

    return [{
      type: dx > 0 ? 'context-drag-right' : 'context-drag-left',
      timeMs: frame.timeMs,
      payload: { dx, dy, angle }
    }];
  }

  reset(): void {
    this.cooldownUntil = 0;
    this.activeTouchId = null;
  }

}
