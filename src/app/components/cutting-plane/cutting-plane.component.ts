import { Component, inject, OnChanges, Input, ElementRef, ViewChild, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '@services/api/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { ColorScale, Data } from 'plotly.js';
import { ColorService } from '@services/color/color.service';
import { Subject, distinctUntilChanged, filter, map, shareReplay, switchMap, takeUntil } from 'rxjs';
import { AppStateService } from '@services/app-state/app-state.service';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { Volume } from '@services/api/api.types';

interface DiscreteColorscaleConfig {
  colorscale: ColorScale;
  zmin: number;
  zmax: number;
}

interface SliceRenderData {
  data: number[][];
  axisValue: number;
  xCoords: number[];
  yCoords: number[];
  orientation: CuttingPlaneOrientation;
}

@Component({
  selector: 'app-cutting-plane',
  imports: [],
  templateUrl: './cutting-plane.component.html',
  styleUrl: './cutting-plane.component.scss'
})
export class CuttingPlaneComponent implements OnInit, OnChanges, OnDestroy {
  @Input() zIndex = 0;
  @Input() xCoords: number[] = [];
  @Input() yCoords: number[] = [];
  @Input() zCoords: number[] = [];
  @Input() classes: number[] = [];
  @Input() cuttingPlaneOrientation: CuttingPlaneOrientation = CuttingPlaneOrientation.XY;
  @ViewChild('plot', { static: true }) plotElement!: ElementRef;
  
  private readonly apiService = inject(ApiService);
  private readonly colorService = inject(ColorService);
  private readonly appStateService = inject(AppStateService);
  private isPlotInitialized = false;
  private currentSliceData: number[][] = [];
  private currentSliceMeta: SliceRenderData | null = null;
  private visibleClasses: number[] = [];
  private fixedColorscaleConfig: DiscreteColorscaleConfig | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly sliceRequest$ = new Subject<{ index: number; orientation: CuttingPlaneOrientation }>();
  private readonly noDataClass = -1;
  private readonly volume$ = this.apiService.getVolume().pipe(shareReplay(1));

  ngOnInit() {
    this.appStateService.visibleClasses$
      .pipe(takeUntil(this.destroy$))
      .subscribe((visibleClasses) => {
        this.visibleClasses = visibleClasses;
        if (this.isPlotInitialized && this.currentSliceData.length > 0 && this.currentSliceMeta) {
          this.restylePlot(this.applyVisibilityFilter(this.currentSliceData), this.currentSliceMeta);
        }
      });

    this.sliceRequest$
      .pipe(
        distinctUntilChanged((a, b) => a.index === b.index && a.orientation === b.orientation),
        filter(() => this.inputsReady()),
        switchMap(({ index, orientation }) => this.getSliceData(index, orientation)),
        takeUntil(this.destroy$)
      )
      .subscribe((slice) => {
        this.renderSlice(slice);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zIndex'] || changes['cuttingPlaneOrientation']) {
      this.sliceRequest$.next({ index: this.zIndex, orientation: this.cuttingPlaneOrientation });
    }

    if (changes['classes'] && this.isPlotInitialized) {
      this.ensureFixedColorscale();
      this.applyFixedColorscale();
    }

    if (!this.isPlotInitialized && this.inputsReady()) {
      this.sliceRequest$.next({ index: this.zIndex, orientation: this.cuttingPlaneOrientation });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Plotly.purge(this.plotElement.nativeElement);
  }

  private inputsReady() {
    return this.xCoords.length > 0 && this.yCoords.length > 0 && this.zCoords.length > 0 && this.classes.length > 0;
  }

  private renderSlice(slice: SliceRenderData) {
    this.currentSliceData = slice.data;
    this.currentSliceMeta = slice;
    const filteredData = this.applyVisibilityFilter(slice.data);
    this.ensureFixedColorscale();
    const colorscaleConfig = this.fixedColorscaleConfig;
    if (!colorscaleConfig) return;

    const trace: Partial<Data> = {
      type: 'heatmap',
      x: slice.xCoords,
      y: slice.yCoords,
      z: filteredData,
      colorscale: colorscaleConfig.colorscale,
      zmin: colorscaleConfig.zmin,
      zmax: colorscaleConfig.zmax,
      zsmooth: false,
      showscale: false
    };

    if (!this.isPlotInitialized) {
      this.createPlot(trace, slice);
      this.isPlotInitialized = true;
    } else {
      this.restylePlot(filteredData, slice);
    }
  }

  private createPlot(trace: Partial<Data>, slice: SliceRenderData) {
    const { title, xLabel, yLabel } = this.getAxisLabels(slice.orientation, slice.axisValue);
    Plotly.newPlot(
      this.plotElement.nativeElement,
      [trace],
      {
        title: { text: title },
        xaxis: { title: { text: xLabel } },
        yaxis: { title: { text: yLabel } },
        margin: { t: 40, b: 40, l: 40, r: 10 },
        autosize: true
      },
      { responsive: true }
    );
  }

  private restylePlot(data: number[][], slice: SliceRenderData) {
    const { title, xLabel, yLabel } = this.getAxisLabels(slice.orientation, slice.axisValue);
    Plotly.restyle(this.plotElement.nativeElement, { z: [data], x: [slice.xCoords], y: [slice.yCoords] }, [0]);
    Plotly.relayout(this.plotElement.nativeElement, {
      title: { text: title },
      xaxis: { title: { text: xLabel } },
      yaxis: { title: { text: yLabel } }
    });
  }

  private applyFixedColorscale() {
    const colorscaleConfig = this.fixedColorscaleConfig;
    if (!colorscaleConfig || !this.isPlotInitialized) return;

    Plotly.restyle(
      this.plotElement.nativeElement,
      {
        colorscale: [colorscaleConfig.colorscale],
        zmin: [colorscaleConfig.zmin],
        zmax: [colorscaleConfig.zmax],
        zsmooth: [false],
        showscale: [false]
      },
      [0]
    );
  }

  private applyVisibilityFilter(data: number[][]): number[][] {
    if (this.classes.length === 0) return data;
    const visible = new Set(this.visibleClasses);
    return data.map((row) => row.map((value) => (visible.has(value) ? value : this.noDataClass)));
  }

  private ensureFixedColorscale(): void {
    if (this.fixedColorscaleConfig || this.classes.length === 0) return;

    const colorscaleClasses = Array.from(new Set([this.noDataClass, ...this.classes]));
    const { colorscale, zmin, zmax } = this.colorService.buildDiscreteColorscale(colorscaleClasses);
    this.fixedColorscaleConfig = {
      colorscale: colorscale as ColorScale,
      zmin,
      zmax
    };
  }

  private getSliceData(index: number, orientation: CuttingPlaneOrientation) {
    const safeIndex = this.clampIndexForOrientation(orientation, index);
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return this.volume$.pipe(
        map((volume) => ({
          data: this.buildXzSlice(volume, safeIndex),
          axisValue: this.yCoords[safeIndex],
          xCoords: this.xCoords,
          yCoords: this.zCoords,
          orientation
        }))
      );
    case CuttingPlaneOrientation.YZ:
      return this.volume$.pipe(
        map((volume) => ({
          data: this.buildYzSlice(volume, safeIndex),
          axisValue: this.xCoords[safeIndex],
          xCoords: this.yCoords,
          yCoords: this.zCoords,
          orientation
        }))
      );
    case CuttingPlaneOrientation.XY:
    default:
      return this.apiService.getSlice(safeIndex).pipe(
        map((slice) => ({
          data: slice.data,
          axisValue: slice.z_val,
          xCoords: this.xCoords,
          yCoords: this.yCoords,
          orientation
        }))
      );
    }
  }

  private clampIndexForOrientation(orientation: CuttingPlaneOrientation, index: number): number {
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

  private buildXzSlice(volume: Volume, yIndex: number): number[][] {
    const zLen = volume.data.length;
    const xLen = volume.data[0]?.[0]?.length ?? 0;
    const data: number[][] = new Array(zLen);

    for (let iz = 0; iz < zLen; iz++) {
      const row: number[] = new Array(xLen);
      for (let ix = 0; ix < xLen; ix++) {
        row[ix] = volume.data[iz][yIndex][ix];
      }
      data[iz] = row;
    }

    return data;
  }

  private buildYzSlice(volume: Volume, xIndex: number): number[][] {
    const zLen = volume.data.length;
    const yLen = volume.data[0]?.length ?? 0;
    const data: number[][] = new Array(zLen);

    for (let iz = 0; iz < zLen; iz++) {
      const row: number[] = new Array(yLen);
      for (let iy = 0; iy < yLen; iy++) {
        row[iy] = volume.data[iz][iy][xIndex];
      }
      data[iz] = row;
    }

    return data;
  }

  private getAxisLabels(orientation: CuttingPlaneOrientation, axisValue: number) {
    const valueText = axisValue.toFixed(1);
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return {
        title: `XZ-Schnitt y = ${valueText} m`,
        xLabel: 'X (m)',
        yLabel: 'Z (m)'
      };
    case CuttingPlaneOrientation.YZ:
      return {
        title: `YZ-Schnitt x = ${valueText} m`,
        xLabel: 'Y (m)',
        yLabel: 'Z (m)'
      };
    case CuttingPlaneOrientation.XY:
    default:
      return {
        title: `XY-Schnitt z = ${valueText} m`,
        xLabel: 'X (m)',
        yLabel: 'Y (m)'
      };
    }
  }
}
