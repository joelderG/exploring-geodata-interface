import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Subscription } from 'rxjs';
import { AppStateService } from '@services/app-state/app-state.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from 'app/shared/model/touch-point';
import { CuttingPlaneInteractionState } from '@shared/enum/cutting-plane-interaction-state';

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
  private readonly currentSecondaryPointSubject = new BehaviorSubject<TouchPoint | null>(null);
  public readonly currentSecondaryPoint$ = this.currentSecondaryPointSubject.asObservable();

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
      this.currentSecondaryPointSubject.next(null);
      this.appStateService.setCuttingPlaneInteractionState(CuttingPlaneInteractionState.Interactive);
      return;
    }

    const deepest = this.findDeepestPoint(nextTouchPoints);
    const secondary = this.findSecondaryDeepPoint(nextTouchPoints, deepest);
    this.appStateService.setCuttingPlaneInteractionState(
      secondary ? CuttingPlaneInteractionState.Frozen : CuttingPlaneInteractionState.Interactive
    );
    this.currentDeepestPointSubject.next(deepest);
    this.currentSecondaryPointSubject.next(secondary);
  }

  private findDeepestPoint(points: TouchPoint[]): TouchPoint | null {
    const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((deepest, current) => {
      const deepestDepth = this.getDepthMagnitude(deepest);
      const currentDepth = this.getDepthMagnitude(current);
      return currentDepth > deepestDepth ? current : deepest;
    }, candidates[0]);
  }

  private findSecondaryDeepPoint(points: TouchPoint[], deepest: TouchPoint | null): TouchPoint | null {
    if (!deepest) {
      return null;
    }

    const candidates = points.filter(tp => Number.isFinite(tp?.Position?.Z));
    if (candidates.length < 2) {
      return null;
    }

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

  public getCurrentTouchPoints(): TouchPoint[] {
    return [...this._currentTouchPoints];
  }

  ngOnDestroy(): void {
    this.touchPointSubscription?.unsubscribe();
    this.interactionStreamingSubscription?.unsubscribe();
    this.stopStreaming();
  }
}
