import { Component, inject, OnChanges, Input, ElementRef, ViewChild, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '@services/api/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { ColorScale, Data } from 'plotly.js';
import { ColorService } from '@services/color/color.service';
import { Subject, distinctUntilChanged, filter, map, shareReplay, switchMap, takeUntil } from 'rxjs';
import { AppStateService } from '@services/app-state/app-state.service';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { Volume } from '@services/api/api.types';

import { ensureSliceIndexInBounds } from '@shared/util/cutting-plane.utils';
import { VolumeCoordinates } from '@shared/interface/volume-coordinates';
import { DiscreteColorscaleConfig } from '@shared/interface/discrete-colorscale-config';
import { SliceRenderData } from '@shared/interface/slice-render-data';

@Component({
  selector: 'app-cutting-plane',
  imports: [],
  templateUrl: './cutting-plane.component.html',
  styleUrl: './cutting-plane.component.scss'
})
export class CuttingPlaneComponent implements OnInit, OnChanges, OnDestroy {
  @Input() zIndex = 0;
  @Input() coordinates: VolumeCoordinates = { xCoordinates: [], yCoordinates: [], zCoordinates: [] };
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
  private readonly axisMismatchWarned = new Set<CuttingPlaneOrientation>();

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
    return this.coordinates.xCoordinates.length > 0 && this.coordinates.yCoordinates.length > 0 && this.coordinates.zCoordinates.length > 0 && this.classes.length > 0;
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
      showscale: false,
      hoverinfo: 'skip'
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
        autosize: true,
        hovermode: false
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
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return this.volume$.pipe(
        map((volume) => {
          const dataIndex = this.clampIndexToVolume(index, orientation, volume);
          const coordIndex = ensureSliceIndexInBounds(
            dataIndex,
            { xCoordinates: this.coordinates.xCoordinates, yCoordinates: this.coordinates.yCoordinates, zCoordinates: this.coordinates.zCoordinates },
            orientation
          );
          return {
            data: this.buildXzSlice(volume, dataIndex),
            axisValue: this.coordinates.yCoordinates[coordIndex],
            xCoords: this.coordinates.xCoordinates,
            yCoords: this.coordinates.zCoordinates,
            orientation
          };
        })
      );
    case CuttingPlaneOrientation.YZ:
      return this.volume$.pipe(
        map((volume) => {
          const dataIndex = this.clampIndexToVolume(index, orientation, volume);
          const coordIndex = ensureSliceIndexInBounds(
            dataIndex,
            this.coordinates,
            orientation
          );
          return {
            data: this.buildYzSlice(volume, dataIndex),
            axisValue: this.coordinates.xCoordinates[coordIndex],
            xCoords: this.coordinates.yCoordinates,
            yCoords: this.coordinates.zCoordinates,
            orientation
          };
        })
      );
    case CuttingPlaneOrientation.XY:
    default:
    { const safeIndex = ensureSliceIndexInBounds(
      index,
      this.coordinates,
      orientation
    );
    return this.apiService.getSlice(safeIndex).pipe(
      map((slice) => ({
        data: slice.data,
        axisValue: slice.z_val,
        xCoords: this.coordinates.xCoordinates,
        yCoords: this.coordinates.yCoordinates,
        orientation
      }))
    ); }
    }
  }

  private buildXzSlice(volume: Volume, yIndex: number): number[][] {
    const zLen = volume.data.length;
    const yLen = volume.data[0]?.length ?? 0;
    const xLen = volume.data[0]?.[0]?.length ?? 0;
    if (zLen === 0 || yLen === 0 || xLen === 0) return [];
    const safeYIndex = Math.min(Math.max(yIndex, 0), Math.max(yLen - 1, 0));
    const data: number[][] = new Array(zLen);

    for (let iz = 0; iz < zLen; iz++) {
      const row: number[] = new Array(xLen);
      for (let ix = 0; ix < xLen; ix++) {
        row[ix] = volume.data[iz][safeYIndex][ix];
      }
      data[iz] = row;
    }

    return data;
  }

  private buildYzSlice(volume: Volume, xIndex: number): number[][] {
    const zLen = volume.data.length;
    const yLen = volume.data[0]?.length ?? 0;
    const xLen = volume.data[0]?.[0]?.length ?? 0;
    if (zLen === 0 || yLen === 0 || xLen === 0) return [];
    const safeXIndex = Math.min(Math.max(xIndex, 0), Math.max(xLen - 1, 0));
    const data: number[][] = new Array(zLen);

    for (let iz = 0; iz < zLen; iz++) {
      const row: number[] = new Array(yLen);
      for (let iy = 0; iy < yLen; iy++) {
        row[iy] = volume.data[iz][iy][safeXIndex];
      }
      data[iz] = row;
    }

    return data;
  }

  private clampIndexToVolume(index: number, orientation: CuttingPlaneOrientation, volume: Volume): number {
    const axisLength = this.getVolumeAxisLength(orientation, volume);
    const maxIndex = Math.max(axisLength - 1, 0);
    const safeIndex = Math.min(Math.max(index, 0), maxIndex);
    this.warnIfAxisMismatch(orientation, volume);
    return safeIndex;
  }

  private getVolumeAxisLength(orientation: CuttingPlaneOrientation, volume: Volume): number {
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return volume.data[0]?.length ?? 0;
    case CuttingPlaneOrientation.YZ:
      return volume.data[0]?.[0]?.length ?? 0;
    case CuttingPlaneOrientation.XY:
    default:
      return volume.data.length;
    }
  }

  private getCoordinateAxisLength(orientation: CuttingPlaneOrientation): number {
    switch (orientation) {
    case CuttingPlaneOrientation.XZ:
      return this.coordinates.yCoordinates.length;
    case CuttingPlaneOrientation.YZ:
      return this.coordinates.xCoordinates.length;
    case CuttingPlaneOrientation.XY:
    default:
      return this.coordinates.zCoordinates.length;
    }
  }

  private warnIfAxisMismatch(orientation: CuttingPlaneOrientation, volume: Volume): void {
    if (this.axisMismatchWarned.has(orientation)) return;
    const volumeLength = this.getVolumeAxisLength(orientation, volume);
    const coordinateLength = this.getCoordinateAxisLength(orientation);
    if (volumeLength !== coordinateLength) {
      this.axisMismatchWarned.add(orientation);
      console.warn('Volume axis length does not match coordinate length.', {
        orientation,
        volumeLength,
        coordinateLength
      });
    }
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
