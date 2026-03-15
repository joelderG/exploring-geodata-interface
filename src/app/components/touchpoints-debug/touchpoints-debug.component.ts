import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DepthInteractionService } from '@services/depth-interaction/depth-interaction.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from 'app/shared/model/touch-point';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-touchpoints-debug',
  imports: [],
  templateUrl: './touchpoints-debug.component.html',
  styleUrl: './touchpoints-debug.component.scss'
})
export class TouchpointsDebugComponent implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription = new Subscription;
  private readonly interactionService = inject(InteractionService);
  private readonly depthInteractionService = inject(DepthInteractionService);

  protected touchPoints: TouchPoint[] = [];
  protected deepestPoint: TouchPoint | undefined;

  ngOnInit() {
    this.subscriptions.add(this.interactionService.Data.subscribe((points) => {
      this.touchPoints = points;
    }));

    this.subscriptions.add(this.depthInteractionService.currentDeepestPoint$.subscribe((point) => {
      if (point) {
        this.deepestPoint = point;
        return;
      }
      this.deepestPoint = undefined;
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  protected formatCoord(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(2);
  }
}
