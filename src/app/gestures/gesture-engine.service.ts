import { Injectable, inject } from "@angular/core";
import { Subject } from "rxjs";
import { InteractionService } from "@services/interaction/interaction.service";
import { TouchFrame } from "./touch-frame";
import { GestureEvent } from "./gesture-types";
import { GestureState } from "./gesture-state";
import { SwipeLeftRightRecognizer } from "./recognizer/swipe-left-right-recognizer";
import { SwipeTopBottomRecognizer } from "./recognizer/swipe-top-bottom-recognizer";
import { SwipeRightLeftRecognizer } from "./recognizer/swipe-right-left-recognizer";
import { ContextMenuDragLeftRecognizer } from "./recognizer/context-menu-drag-left-recognizer";
import { ContextMenuDragRightRecognizer } from "./recognizer/context-menu-drag-right-recognizer";
import { PullOutResetRecognizer } from "./recognizer/pull-out-reset-recognizer";
import { TouchPoint } from "@shared/model/touch-point";

// Central gesture pipeline: builds frames, maintains history, runs recognizers

@Injectable({ providedIn: 'root' })
export class GestureEngineService {
  private readonly interaction = inject(InteractionService);
  private readonly eventSubject = new Subject<GestureEvent>();
  public readonly events$ = this.eventSubject.asObservable();

  private readonly state: GestureState = { histories: new Map() };
  private readonly recognizers = [
    new SwipeLeftRightRecognizer(),
    new SwipeTopBottomRecognizer(),
    new SwipeRightLeftRecognizer(),
    new ContextMenuDragLeftRecognizer(),
    new ContextMenuDragRightRecognizer(),
    new PullOutResetRecognizer()
  ];

  constructor() {
    this.interaction.Data.subscribe((touchPoints) => {
      const frame = this.buildFrame(touchPoints);
      this.updateState(frame);

      for (const rec of this.recognizers) {
        const events = rec.update(frame, this.state);
        for (const ev of events) this.eventSubject.next(ev);
      }

      this.state.lastFrame = frame;
    });
  }

  private buildFrame(points: TouchPoint[]): TouchFrame {
    const timeMs = Date.now();
    const valid = (points ?? []).filter(p => p?.Position.IsValid);
    return { timeMs, points: valid };
  }

  private updateState(frame: TouchFrame): void {
    const cutoffMs = frame.timeMs - 800;
    const histories = this.state.histories;

    for (const p of frame.points) {
      const id = p.TouchId;
      const x = p.Position.X;
      const y = p.Position.Y;
      const z = p.Position.Z;

      const history = histories.get(id) ?? { id, samples: [], lastSeenMs: 0 };
      history.samples.push({ x, y, z, timeMs: frame.timeMs });
      history.lastSeenMs = frame.timeMs;

      // drop old samples
      history.samples = history.samples.filter(s => s.timeMs >= cutoffMs);
      histories.set(id, history);
    }

    for (const [id, h] of histories.entries()) {
      if (h.lastSeenMs < cutoffMs) histories.delete(id);
    }
  }
}
