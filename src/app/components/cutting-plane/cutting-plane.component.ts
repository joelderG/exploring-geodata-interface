import { Component, inject, OnChanges, Input, ElementRef, ViewChild, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '@services/api-service/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { ColorScale, Data } from 'plotly.js';
import { ColorService } from '@services/color-service/color.service';
import { Subject, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs';
import { AppStateService } from '@services/app-state-service/app-state.service';

interface DiscreteColorscaleConfig {
  colorscale: ColorScale;
  zmin: number;
  zmax: number;
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
  @Input() classes: number[] = [];
  @ViewChild('plot', { static: true }) plotElement!: ElementRef;
  
  private readonly apiService = inject(ApiService);
  private readonly colorService = inject(ColorService);
  private readonly appStateService = inject(AppStateService);
  private isPlotInitialized = false;
  private currentSliceData: number[][] = [];
  private currentZVal = 0;
  private visibleClasses: number[] = [];
  private fixedColorscaleConfig: DiscreteColorscaleConfig | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly zIndex$ = new Subject<number>();
  private readonly noDataClass = -1;

  ngOnInit() {
    this.appStateService.visibleClasses$
      .pipe(takeUntil(this.destroy$))
      .subscribe((visibleClasses) => {
        this.visibleClasses = visibleClasses;
        if (this.isPlotInitialized && this.currentSliceData.length > 0) {
          this.restylePlot(this.applyVisibilityFilter(this.currentSliceData), this.currentZVal);
        }
      });

    this.zIndex$
      .pipe(
        distinctUntilChanged(),
        filter(() => this.inputsReady()),
        switchMap((zIndex) => this.apiService.getSlice(zIndex)),
        takeUntil(this.destroy$)
      )
      .subscribe((slice) => {
        this.renderSlice(slice.data, slice.z_val);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zIndex']) {
      this.zIndex$.next(this.zIndex);
    }

    if (changes['classes'] && this.isPlotInitialized) {
      this.ensureFixedColorscale();
      this.applyFixedColorscale();
    }

    if (!this.isPlotInitialized && this.inputsReady()) {
      this.zIndex$.next(this.zIndex);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Plotly.purge(this.plotElement.nativeElement);
  }

  private inputsReady() {
    return this.xCoords.length > 0 && this.yCoords.length > 0 && this.classes.length > 0;
  }

  private renderSlice(data: number[][], z_val: number) {
    this.currentSliceData = data;
    this.currentZVal = z_val;
    const filteredData = this.applyVisibilityFilter(data);
    this.ensureFixedColorscale();
    const colorscaleConfig = this.fixedColorscaleConfig;
    if (!colorscaleConfig) return;

    const trace: Partial<Data> = {
      type: 'heatmap',
      x: this.xCoords,
      y: this.yCoords,
      z: filteredData,
      colorscale: colorscaleConfig.colorscale,
      zmin: colorscaleConfig.zmin,
      zmax: colorscaleConfig.zmax,
      zsmooth: false,
      showscale: false
    };

    if (!this.isPlotInitialized) {
      this.createPlot(trace, z_val);
      this.isPlotInitialized = true;
    } else {
      this.restylePlot(filteredData, z_val);
    }
  }

  private createPlot(trace: Partial<Data>, z_val: number) {
    Plotly.newPlot(this.plotElement.nativeElement, [trace], {
      title: { text: `XY-Schnitt z = ${z_val.toFixed(1)} m` },
      margin: { t: 40, b: 40, l: 40, r: 10 }
    });
  }

  private restylePlot(data: number[][], z_val: number) {
    Plotly.restyle(this.plotElement.nativeElement, { z: [data] }, [0]);
    Plotly.relayout(this.plotElement.nativeElement, { title: { text: `XY-Schnitt z = ${z_val.toFixed(1)} m` } });
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
}
