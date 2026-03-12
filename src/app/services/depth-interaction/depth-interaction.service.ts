import { inject, Injectable, OnDestroy } from '@angular/core';
import { distinctUntilChanged, Subscription } from 'rxjs';
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
    console.log(touchPoints);
  }

  ngOnDestroy(): void {
    this.touchPointSubscription?.unsubscribe();
    this.interactionStreamingSubscription?.unsubscribe();
    this.stopStreaming();
  }
}
