import { Component, ElementRef, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ApiService } from '@services/api-service/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { Data, Layout } from 'plotly.js';
import { Volume } from '@services/api-service/api.types';
import { ColorService } from '@services/color-service/color.service';
import { AppStateService } from '@services/app-state-service/app-state.service';
import { Subject, takeUntil } from 'rxjs';

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

    if (changes['zIndex']) {
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
        visible: true
      });

      this.classPoints.push({ x: xs, y: ys, z: zs });
    });

    const zVal = this.zCoords[this.zIndex];
    const zPlane = this.yCoords.map(() => this.xCoords.map(() => zVal));

    traces.push({
      type: 'surface',
      x: this.xCoords,
      y: this.yCoords,
      z: zPlane,
      opacity: 0.25,
      showscale: false,
      colorscale: 'Greys',
      name: 'Schnittebene',
      showlegend: false
    });

    const layout: Partial<Layout> = {
      height: 600,
      margin: { l: 0, r: 0, t: 40, b: 0 },
      legend: {
        title: { text: 'Gesteinsklassen' },
        itemclick: 'toggle',
        itemdoubleclick: 'toggleothers'
      },
      scene: {
        xaxis: { title: { text: 'X (m)' }, range: [Math.min(...this.xCoords), Math.max(...this.xCoords)] },
        yaxis: { title: { text: 'Y (m)' }, range: [Math.min(...this.yCoords), Math.max(...this.yCoords)] },
        zaxis: { title: { text: 'Z (m)' }, range: [Math.min(...this.zCoords), Math.max(...this.zCoords)] },
        aspectmode: 'cube'
      } 
    };

    Plotly.newPlot(this.plotElement.nativeElement, traces, layout, {
      scrollZoom: true,
      responsive: true
    });

    this.bindLegendSync();
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
    const zVal = this.zCoords[this.zIndex];
    const zPlane = this.yCoords.map(() => this.xCoords.map(() => zVal));

    // Surface ist immer der letzte Trace (Index = classes.length)
    Plotly.restyle(
      this.plotElement.nativeElement,
      { z: [zPlane] },
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

  private bindLegendSync() {
    this.plotElement.nativeElement.on('plotly_legendclick', (event: { curveNumber: number }) => {
      if (event.curveNumber >= this.classes.length) {
        return true;
      }

      this.appStateService.toggleClassVisibilityAtIndex(event.curveNumber);
      return false;
    });

    this.plotElement.nativeElement.on('plotly_legenddoubleclick', (event: { curveNumber: number }) => {
      if (event.curveNumber >= this.classes.length) {
        return true;
      }

      this.appStateService.setOnlyClassVisible(event.curveNumber);
      return false;
    });
  }

  private updateRenderedPoints() {
    const targetZ = this.zCoords[this.zIndex];
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
        if (Math.abs(points.z[i] - targetZ) < eps) {
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
}
