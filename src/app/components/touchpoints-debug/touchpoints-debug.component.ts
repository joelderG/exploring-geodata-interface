import { Component, inject, OnInit } from '@angular/core';
import { DepthInteractionService } from '@services/depth-interaction/depth-interaction.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from 'app/shared/model/touch-point';

@Component({
  selector: 'app-touchpoints-debug',
  imports: [],
  templateUrl: './touchpoints-debug.component.html',
  styleUrl: './touchpoints-debug.component.scss'
})
export class TouchpointsDebugComponent implements OnInit {
  private readonly interactionService = inject(InteractionService);
  private readonly depthInteractionService = inject(DepthInteractionService);

  protected touchPoints: TouchPoint[] = [];
  protected deepestPoint: TouchPoint | undefined;

  ngOnInit() {
    this.interactionService.Data.subscribe((points) => {
      this.touchPoints = points;
    });

    this.depthInteractionService.currentDeepestPoint$.subscribe((point) => {
      if (point) this.deepestPoint = point;
    });
  }

  protected formatCoord(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(2);
  }
}
