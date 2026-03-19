import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { TouchPoint } from '@shared/model/touch-point';
import { normalizedToDisplayPosition } from '@shared/util/normalized-coordinate.utils';

@Component({
  selector: 'app-context-menu',
  imports: [],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss'
})
export class ContextMenuComponent implements OnChanges, OnDestroy {
  @Input() point: TouchPoint | null = null;
  @Input() container: HTMLElement | null = null;

  @HostBinding('style.left.px')
  protected hostLeft: number | null = null;

  @HostBinding('style.top.px')
  protected hostTop: number | null = null;

  @HostBinding('style.display')
  protected hostDisplay = 'none';

  private resizeObserver: ResizeObserver | null = null;
  private containerSize: { width: number; height: number } = { width: 0, height: 0 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['container']) {
      this.attachResizeObserver();
      this.updateContainerSize();
      this.recomputePosition();
    }

    if (changes['point']) {
      this.recomputePosition();
    }
  }

  ngOnDestroy(): void {
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
      this.recomputePosition();
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

  private recomputePosition(): void {
    const point = this.point;
    if (!point) {
      this.hostLeft = null;
      this.hostTop = null;
      this.updateVisibility();
      return;
    }

    const x = normalizedToDisplayPosition(point.Position.X, this.containerSize.width, { range: 'autoSigned' });
    const y = normalizedToDisplayPosition(point.Position.Y, this.containerSize.height, { range: 'autoSigned' });

    if (x === null || y === null) {
      this.hostLeft = null;
      this.hostTop = null;
      this.updateVisibility();
      return;
    }

    this.hostLeft = x;
    this.hostTop = y;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const hasPosition = Number.isFinite(this.hostLeft ?? NaN) && Number.isFinite(this.hostTop ?? NaN);
    this.hostDisplay = this.point && hasPosition ? 'block' : 'none';
  }
}
