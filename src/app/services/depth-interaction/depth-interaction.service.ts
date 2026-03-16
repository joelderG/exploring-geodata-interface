import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Subscription } from 'rxjs';
import { AppStateService } from '@services/app-state/app-state.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from 'app/shared/model/touch-point';

@Injectable({
  providedIn: 'root'
})
export class DepthInteractionService implements OnDestroy {
  private readonly appStateService = inject(AppStateService);
  private readonly interactionService = inject(InteractionService);

  private interactionStreamingSubscription?: Subscription;
  private touchPointSubscription?: Subscription;

  private readonly currentDeepestPointSubject = new BehaviorSubject<TouchPoint | null>(null);
  public readonly currentDeepestPoint$ = this.currentDeepestPointSubject.asObservable();

  private _currentTouchPoints: TouchPoint[] = [];

  public constructor() {
    this.interactionStreamingSubscription = this.appStateService.interactionStreamingActive$
      .pipe(distinctUntilChanged())
      .subscribe((isActive) => {
        if (isActive) {
          this.startStreaming();
          return;
        }
        this.stopStreaming();
      });

    this.touchPointSubscription = this.interactionService.Data.subscribe((touchPoints) => {
      this.handleTouchPoints(touchPoints);
    });
  }

  public toggleStreaming(): void {
    this.appStateService.toggleInteractionStreamingActive();
  }

  public startStreaming(): void {
    this.interactionService.startStreaming();
  }

  public stopStreaming(): void {
    this.interactionService.stopStreaming();
  }

  private handleTouchPoints(touchPoints: TouchPoint[]): void {
    const nextTouchPoints = Array.isArray(touchPoints) ? touchPoints : [];
    this._currentTouchPoints = nextTouchPoints;

    if (nextTouchPoints.length === 0) {
      this.currentDeepestPointSubject.next(null);
      return;
    }

    const deepest = this.findDeepestPoint(nextTouchPoints);
    this.currentDeepestPointSubject.next(deepest);
  }

  private findDeepestPoint(points: TouchPoint[]): TouchPoint | null {
    const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((deepest, current) => {
      const deepestZ = deepest?.Position?.Z ?? -Infinity;
      const currentZ = current?.Position?.Z ?? -Infinity;
      return currentZ > deepestZ ? current : deepest;
    }, candidates[0]);
  }

  public getCurrentTouchPoints(): TouchPoint[] {
    return [...this._currentTouchPoints];
  }

  ngOnDestroy(): void {
    this.touchPointSubscription?.unsubscribe();
    this.interactionStreamingSubscription?.unsubscribe();
    this.stopStreaming();
  }
}
