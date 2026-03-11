import { Component, ElementRef, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ApiService } from '@services/api/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { Data, Layout } from 'plotly.js';
import { Volume } from '@services/api/api.types';
import { ColorService } from '@services/color/color.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { Subject, takeUntil } from 'rxjs';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

@Component({
  selector: 'app-volume-viewer',
  imports: [],
  templateUrl: './volume-viewer.component.html',
  styleUrl: './volume-viewer.component.scss'
})
export class VolumeViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() xCoords: number[] = [];
  @Input() yCoords: number[] = [];
  @Input() zCoords: number[] = [];
  @Input() classes: number[] = [];
  @Input() cuttingPlaneOrientation: CuttingPlaneOrientation = CuttingPlaneOrientation.XY;

  @Input() zIndex = 0;
  @ViewChild('plot', { static: true }) plotElement!: ElementRef;

  private readonly apiService = inject(ApiService);
  private readonly colorService = inject(ColorService);
  private readonly appStateService = inject(AppStateService);
  private readonly destroy$ = new Subject<void>();
  private isPlotInitialized = false;
  private volume?: Volume;
  private classVisible: boolean[] = [];
  private classPoints: { x: number[]; y: number[]; z: number[] }[] = [];
  private showOnlyCurrentSlicePoints = false;

  ngOnInit() {
    this.appStateService.classVisibility$
      .pipe(takeUntil(this.destroy$))
      .subscribe((classVisible) => {
        this.classVisible = classVisible;
        if (this.isPlotInitialized) {
          this.updateVisibility();
        }
      });

    this.appStateService.showOnlyCurrentSlicePoints$
      .pipe(takeUntil(this.destroy$))
      .subscribe((showOnlyCurrentSlicePoints) => {
        this.showOnlyCurrentSlicePoints = showOnlyCurrentSlicePoints;
        if (this.isPlotInitialized) {
          this.updateRenderedPoints();
        }
      });

    this.apiService.getVolume().subscribe((volume) => {
      this.volume = volume;
      this.tryBuildPlot();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.isPlotInitialized && this.volume) {
      this.tryBuildPlot();
    }
    if (!this.isPlotInitialized) return;

    if (changes['zIndex'] || changes['cuttingPlaneOrientation']) {
      this.updateSlicePlane();
      if (this.showOnlyCurrentSlicePoints) {
        this.updateRenderedPoints();
      }
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    Plotly.purge(this.plotElement.nativeElement);
  }

  private buildPlot(volume: Volume) {
    const nz = volume.data.length;
    const ny = volume.data[0].length;
    const nx = volume.data[0][0].length;

    const traces: Partial<Data>[] = [];
    this.classPoints = [];

    this.classes.forEach((cls, i) => {
      const xs: number[] = [], ys: number[] = [], zs: number[] = [];

      for (let iz = 0; iz < nz; iz++) {
        for (let iy = 0; iy < ny; iy++) {
          for (let ix = 0; ix < nx; ix++) {
            if (volume.data[iz][iy][ix] === cls) {
              xs.push(this.xCoords[ix]);
              ys.push(this.yCoords[iy]);
              zs.push(this.zCoords[iz]);
            }
          }
        }
      }

      traces.push({
        type: 'scatter3d',
        x: xs, y: ys, z: zs,
        mode: 'markers',
        marker: { size: 3, color: this.colorService.getColor(i), opacity: 0.4 },
        name: `Klasse ${cls}`,
        legendgroup: `cls${cls}`,
        visible: true,
        showlegend: false
      });

      this.classPoints.push({ x: xs, y: ys, z: zs });
    });

    const { xGrid, yGrid, zGrid } = this.buildPlaneGrid(this.cuttingPlaneOrientation, this.zIndex);

    traces.push({
      type: 'surface',
      x: xGrid,
      y: yGrid,
      z: zGrid,
      opacity: 0.25,
      showscale: false,
      colorscale: 'Greys',
      name: 'Schnittebene',
      showlegend: false
    });

    const layout: Partial<Layout> = {
      autosize: true,
      margin: { l: 0, r: 0, t: 40, b: 0 },
      scene: {
        xaxis: { title: { text: 'X (m)' }, range: [Math.min(...this.xCoords), Math.max(...this.xCoords)] },
        yaxis: { title: { text: 'Y (m)' }, range: [Math.min(...this.yCoords), Math.max(...this.yCoords)] },
        zaxis: { title: { text: 'Z (m)' }, range: [Math.min(...this.zCoords), Math.max(...this.zCoords)] },
        aspectmode: 'cube',
        camera: {
          eye: { x: -1.25, y: -1.25, z: 1.25 }
        }
      } 
    };

    Plotly.newPlot(this.plotElement.nativeElement, traces, layout, {
      scrollZoom: true,
      responsive: true
    });

    this.isPlotInitialized = true;
    this.updateRenderedPoints();
    this.updateVisibility();
  }

  private inputsReady() {
    return (
      this.xCoords.length > 0 &&
      this.yCoords.length > 0 &&
      this.zCoords.length > 0 &&
      this.classes.length > 0
    );
  }

  private tryBuildPlot() {
    if (this.isPlotInitialized || !this.volume || !this.inputsReady()) return;
    this.buildPlot(this.volume);
  }

  private updateSlicePlane() {
    const { xGrid, yGrid, zGrid } = this.buildPlaneGrid(this.cuttingPlaneOrientation, this.zIndex);

    // Surface ist immer der letzte Trace (Index = classes.length)
    Plotly.restyle(
      this.plotElement.nativeElement,
      { x: [xGrid], y: [yGrid], z: [zGrid] },
      [this.classes.length]
    );
  }

  private updateVisibility() {
    this.classes.forEach((_, i) => {
      const visible = this.classVisible[i] ?? true;
      Plotly.restyle(
        this.plotElement.nativeElement,
        { visible: visible ? true : 'legendonly' },
        [i]
      );
    });
  }

  private updateRenderedPoints() {
    const targetValue = this.getTargetAxisValue(this.cuttingPlaneOrientation, this.zIndex);
    const eps = 1e-9;

    this.classPoints.forEach((points, index) => {
      if (!this.showOnlyCurrentSlicePoints) {
        Plotly.restyle(
          this.plotElement.nativeElement,
          { x: [points.x], y: [points.y], z: [points.z] },
          [index]
        );
        return;
      }

      const xFiltered: number[] = [];
      const yFiltered: number[] = [];
      const zFiltered: number[] = [];

      for (let i = 0; i < points.z.length; i++) {
        const axisValue = this.getAxisValueForOrientation(this.cuttingPlaneOrientation, points, i);
        if (Math.abs(axisValue - targetValue) < eps) {
          xFiltered.push(points.x[i]);
          yFiltered.push(points.y[i]);
          zFiltered.push(points.z[i]);
        }
      }

      Plotly.restyle(
        this.plotElement.nativeElement,
        { x: [xFiltered], y: [yFiltered], z: [zFiltered] },
        [index]
      );
    });
  }

  private buildPlaneGrid(orientation: CuttingPlaneOrientation, index: number) {
    const safeIndex = this.clampIndexForOrientation(orientation, index);
    const xLen = this.xCoords.length;
    const yLen = this.yCoords.length;
    const zLen = this.zCoords.length;

    if (xLen === 0 || yLen === 0 || zLen === 0) {
      return { xGrid: [[]], yGrid: [[]], zGrid: [[]] };
    }

    switch (orientation) {
    case CuttingPlaneOrientation.XZ: {
      const yVal = this.yCoords[safeIndex];
      const xGrid = Array.from({ length: zLen }, () => [...this.xCoords]);
      const yGrid = Array.from({ length: zLen }, () => new Array(xLen).fill(yVal));
      const zGrid = this.zCoords.map((zVal) => new Array(xLen).fill(zVal));
      return { xGrid, yGrid, zGrid };
    }
    case CuttingPlaneOrientation.YZ: {
      const xVal = this.xCoords[safeIndex];
      const xGrid = Array.from({ length: zLen }, () => new Array(yLen).fill(xVal));
      const yGrid = Array.from({ length: zLen }, () => [...this.yCoords]);
      const zGrid = this.zCoords.map((zVal) => new Array(yLen).fill(zVal));
      return { xGrid, yGrid, zGrid };
    }
    case CuttingPlaneOrientation.XY:
    default: {
      const zVal = this.zCoords[safeIndex];
      const xGrid = Array.from({ length: yLen }, () => [...this.xCoords]);
      const yGrid = this.yCoords.map((yVal) => new Array(xLen).fill(yVal));
      const zGrid = Array.from({ length: yLen }, () => new Array(xLen).fill(zVal));
      return { xGrid, yGrid, zGrid };
    }
    }
  }

  private clampIndexForOrientation(orientation: CuttingPlaneOrientation, index: number) {
    const maxIndex = this.getAxisLengthForOrientation(orientation) - 1;
    return Math.min(Math.max(index, 0), Math.max(maxIndex, 0));
  }

  private getAxisLengthForOrientation(orientation: CuttingPlaneOrientation): number {
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return this.yCoords.length;
    case CuttingPlaneOrientation.YZ:
      return this.xCoords.length;
    case CuttingPlaneOrientation.XY:
    default:
      return this.zCoords.length;
    }
  }

  private getTargetAxisValue(orientation: CuttingPlaneOrientation, index: number): number {
    const safeIndex = this.clampIndexForOrientation(orientation, index);
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return this.yCoords[safeIndex];
    case CuttingPlaneOrientation.YZ:
      return this.xCoords[safeIndex];
    case CuttingPlaneOrientation.XY:
    default:
      return this.zCoords[safeIndex];
    }
  }

  private getAxisValueForOrientation(
    orientation: CuttingPlaneOrientation,
    points: { x: number[]; y: number[]; z: number[] },
    index: number
  ): number {
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return points.y[index];
    case CuttingPlaneOrientation.YZ:
      return points.x[index];
    case CuttingPlaneOrientation.XY:
    default:
      return points.z[index];
    }
  }
}
