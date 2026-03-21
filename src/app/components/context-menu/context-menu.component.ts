import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
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
  @Input() leftDisabled = false;
  @Input() rightDisabled = false;

  @Output() leftSelected = new EventEmitter<void>();
  @Output() rightSelected = new EventEmitter<void>();

  @HostBinding('style.left.px')
  protected hostLeft: number | null = null;

  @HostBinding('style.top.px')
  protected hostTop: number | null = null;

  @HostBinding('style.display')
  protected hostDisplay = 'none';

  private resizeObserver: ResizeObserver | null = null;
  private containerSize: { width: number; height: number } = { width: 0, height: 0 };
  private pinnedTouchId: number | null = null;
  private pinnedPosition: { x: number; y: number } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['container']) {
      this.attachResizeObserver();
      this.updateContainerSize();
      this.recomputePosition();
    }

    if (changes['point']) {
      this.updatePinnedPoint();
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
    const position = this.pinnedPosition;
    if (!position) {
      this.hostLeft = null;
      this.hostTop = null;
      this.updateVisibility();
      return;
    }

    const x = normalizedToDisplayPosition(position.x, this.containerSize.width, { range: 'autoSigned' });
    const y = normalizedToDisplayPosition(position.y, this.containerSize.height, { range: 'autoSigned' });

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

  private updatePinnedPoint(): void {
    const nextPoint = this.point;
    if (!nextPoint) {
      this.pinnedTouchId = null;
      this.pinnedPosition = null;
      return;
    }

    if (this.pinnedTouchId === null || this.pinnedTouchId !== nextPoint.TouchId) {
      this.pinnedTouchId = nextPoint.TouchId;
      this.pinnedPosition = { x: nextPoint.Position.X, y: nextPoint.Position.Y };
    }
  }

  private updateVisibility(): void {
    const hasPosition = Number.isFinite(this.hostLeft ?? NaN) && Number.isFinite(this.hostTop ?? NaN);
    this.hostDisplay = this.pinnedPosition && hasPosition ? 'block' : 'none';
  }

  protected onLeftSelected(): void {
    if (this.leftDisabled) return;
    this.leftSelected.emit();
  }

  protected onRightSelected(): void {
    if (this.rightDisabled) return;
    this.rightSelected.emit();
  }
}
