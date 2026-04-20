import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Subscription } from 'rxjs';
import { AppStateService } from '@services/app-state/app-state.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from 'app/shared/model/touch-point';
import { CuttingPlaneInteractionState } from '@shared/enum/cutting-plane-interaction-state';
import { getDeepestPoint, getSecondaryDeepPoint } from '@shared/util/touch-point.utils';

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

    const deepest = getDeepestPoint(nextTouchPoints);
    const secondary = getSecondaryDeepPoint(nextTouchPoints, deepest);
    this.appStateService.setCuttingPlaneInteractionState(
      secondary ? CuttingPlaneInteractionState.Frozen : CuttingPlaneInteractionState.Interactive
    );
    this.currentDeepestPointSubject.next(deepest);
    this.currentSecondaryPointSubject.next(secondary);
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
