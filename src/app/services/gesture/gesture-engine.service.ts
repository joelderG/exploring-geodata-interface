import { Injectable, OnDestroy, inject } from "@angular/core";
import { Subject, Subscription, distinctUntilChanged } from "rxjs";
import { InteractionService } from "@services/interaction/interaction.service";
import { AppStateService } from "@services/app-state/app-state.service";
import { TouchFrame } from "@shared/interface/touch-frame";
import { GestureEvent } from "@shared/gesture/gesture-types";
import { GestureStateInterface } from "@shared/interface/gestureState.interface";
import { SwipeHorizontalRecognizer } from "@shared/gesture/recognizer/swipe-horizontal-recognizer";
import { SwipeVerticalRecognizer } from "@shared/gesture/recognizer/swipe-vertical-recognizer";
import { ContextMenuDragRecognizer } from "@shared/gesture/recognizer/context-menu-drag-recognizer";
import { TouchPoint } from "@shared/model/touch-point";
import { gestureConfig } from "@shared/gesture/gesture-config";

// Central gesture pipeline: builds frames, maintains history, runs recognizers

@Injectable({ providedIn: 'root' })
export class GestureEngineService implements OnDestroy {
  private readonly appStateService = inject(AppStateService);
  private readonly interaction = inject(InteractionService);
  private readonly eventSubject = new Subject<GestureEvent>();
  public readonly events$ = this.eventSubject.asObservable();
  private readonly subscriptions = new Subscription();
  private isStreamingActive = false;

  private readonly state: GestureStateInterface = { histories: new Map() };
  private readonly recognizers = [
    new SwipeHorizontalRecognizer(),
    new SwipeVerticalRecognizer(),
    new ContextMenuDragRecognizer()
  ];

  constructor() {
    this.subscriptions.add(
      this.appStateService.interactionStreamingActive$
        .pipe(distinctUntilChanged())
        .subscribe((isActive) => {
          this.isStreamingActive = isActive;
          if (!isActive) {
            this.resetEngine();
          }
        })
    );

    this.subscriptions.add(this.interaction.Data.subscribe((touchPoints) => {
      if (!this.isStreamingActive) return;
      const frame = this.buildFrame(touchPoints);
      this.updateState(frame);

      for (const rec of this.recognizers) {
        const events = rec.update(frame, this.state);
        for (const ev of events) this.eventSubject.next(ev);
      }

      this.state.lastFrame = frame;
    }));
  }

  private buildFrame(points: TouchPoint[]): TouchFrame {
    const timeMs = Date.now();
    const valid = (points ?? []).filter(p => p?.Position.IsValid);
    return { timeMs, points: valid };
  }

  private updateState(frame: TouchFrame): void {
    const cutoffMs = frame.timeMs - gestureConfig.historyWindowMs;
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

  private resetEngine(): void {
    this.state.histories.clear();
    this.state.lastFrame = undefined;
    for (const rec of this.recognizers) {
      rec.reset();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
