import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { InteractionService } from '@services/interaction/interaction.service';
import { TouchPoint } from '@shared/model/touch-point';
import { normalizedToDisplayPosition } from '@shared/util/normalized-coordinate.utils';
import { Subscription } from 'rxjs';

interface TouchpointMarker {
  id: number;
  left: number;
  top: number;
}

@Component({
  selector: 'app-touchpoint-markers',
  imports: [],
  templateUrl: './touchpoint-markers.component.html',
  styleUrl: './touchpoint-markers.component.scss'
})
export class TouchpointMarkersComponent implements OnInit, OnChanges, OnDestroy {
  @Input() container: HTMLElement | null = null;

  protected markers: TouchpointMarker[] = [];

  private readonly interactionService = inject(InteractionService);
  private readonly subscriptions: Subscription = new Subscription();
  private resizeObserver: ResizeObserver | null = null;
  private containerSize: { width: number; height: number } = { width: 0, height: 0 };
  private rawPoints: TouchPoint[] = [];

  ngOnInit(): void {
    this.subscriptions.add(this.interactionService.Data.subscribe((points) => {
      this.rawPoints = Array.isArray(points) ? points : [];
      this.recomputeMarkers();
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['container']) {
      this.attachResizeObserver();
      this.updateContainerSize();
      this.recomputeMarkers();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private attachResizeObserver(): void {
    if (!this.container) {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      return;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.updateContainerSize();
      this.recomputeMarkers();
    });

    this.resizeObserver.observe(this.container);
  }

  private updateContainerSize(): void {
    if (!this.container) {
      this.containerSize = { width: 0, height: 0 };
      return;
    }

    this.containerSize = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
  }

  private recomputeMarkers(): void {
    if (!this.container || this.containerSize.width === 0 || this.containerSize.height === 0) {
      this.markers = [];
      return;
    }

    const nextMarkers: TouchpointMarker[] = [];
    for (const point of this.rawPoints) {
      if (point?.Position?.IsValid === false) continue;
      const x = normalizedToDisplayPosition(point.Position.X, this.containerSize.width, { range: 'autoSigned' });
      const y = normalizedToDisplayPosition(point.Position.Y, this.containerSize.height, { range: 'autoSigned' });
      if (x === null || y === null) continue;
      nextMarkers.push({ id: point.TouchId, left: x, top: y });
    }

    this.markers = nextMarkers;
  }
}
