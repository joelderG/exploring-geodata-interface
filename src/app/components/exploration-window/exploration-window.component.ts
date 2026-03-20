import {
  Component,
  DestroyRef,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject
} from '@angular/core';
import { ApiService } from '@services/api/api.service';
import { Volume } from '@services/api/api.types';
import { VolumeCoordinates } from '@shared/interface/volume-coordinates';
import { TouchPoint } from '@shared/model/touch-point';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import {
  normalizedToCoordinateIndex,
  normalizedToDisplayPosition,
  NormalizedIndexResult
} from '@shared/util/normalized-coordinate.utils';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface ExplorationContext {
  touchId: number;
  normalized: { x: number; y: number; z: number };
  indices: { x: number; y: number; z: number };
  coordinates: { x: number; y: number; z: number };
  classValue: number | null;
}

@Component({
  selector: 'app-exploration-window',
  imports: [],
  templateUrl: './exploration-window.component.html',
  styleUrl: './exploration-window.component.scss'
})
export class ExplorationWindowComponent implements OnInit, OnChanges, OnDestroy {
  @Input() deepestPoint: TouchPoint | null = null;
  @Input() coordinates: VolumeCoordinates = { xCoordinates: [], yCoordinates: [], zCoordinates: [] };
  @Input() container: HTMLElement | null = null;
  @Input() cuttingPlaneOrientation: CuttingPlaneOrientation = CuttingPlaneOrientation.XY;

  protected context: ExplorationContext | null = null;

  @HostBinding('style.left.px')
  protected hostLeft: number | null = null;

  @HostBinding('style.top.px')
  protected hostTop: number | null = null;

  @HostBinding('style.display')
  protected hostDisplay = 'none';

  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private volume: Volume | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private containerSize: { width: number; height: number } = { width: 0, height: 0 };

  ngOnInit(): void {
    this.apiService
      .getVolume()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((volume) => {
        this.volume = volume;
        this.recomputeContext();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['container']) {
      this.attachResizeObserver();
      this.updateContainerSize();
    }

    if (changes['deepestPoint'] || changes['coordinates']) {
      this.recomputeContext();
      this.recomputePosition();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected formatCoord(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(2);
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

  private recomputeContext(): void {
    const point = this.deepestPoint;
    const volume = this.volume;
    if (!point || !volume) {
      this.context = null;
      this.updateVisibility();
      return;
    }

    const x = normalizedToCoordinateIndex(point.Position.X, this.coordinates.xCoordinates, { range: 'autoSigned' });
    const y = normalizedToCoordinateIndex(point.Position.Y, this.coordinates.yCoordinates, { range: 'autoSigned' });
    const z = normalizedToCoordinateIndex(point.Position.Z, this.coordinates.zCoordinates, {
      range: 'depth',
      invert: this.cuttingPlaneOrientation === CuttingPlaneOrientation.XY
    });

    if (!x || !y || !z) {
      this.context = null;
      this.updateVisibility();
      return;
    }

    const classValue = this.getClassAt(volume, x, y, z);

    this.context = {
      touchId: point.TouchId,
      normalized: { x: point.Position.X, y: point.Position.Y, z: point.Position.Z },
      indices: { x: x.index, y: y.index, z: z.index },
      coordinates: { x: x.value, y: y.value, z: z.value },
      classValue
    };

    this.updateVisibility();
  }

  private getClassAt(
    volume: Volume,
    x: NormalizedIndexResult,
    y: NormalizedIndexResult,
    z: NormalizedIndexResult
  ): number | null {
    const zPlane = volume.data[z.index];
    const yRow = zPlane?.[y.index];
    const value = yRow?.[x.index];
    return typeof value === 'number' ? value : null;
  }

  private recomputePosition(): void {
    const point = this.deepestPoint;
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
    this.hostDisplay = this.context && hasPosition ? 'block' : 'none';
  }
}
