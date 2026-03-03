import { Component, inject, OnChanges, Input, ElementRef, ViewChild, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '@services/api-service/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { ColorScale, Data } from 'plotly.js';
import { ColorService } from '@services/color-service/color.service';
import { Subject, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-slice-heatmap',
  imports: [],
  templateUrl: './slice-heatmap.component.html',
  styleUrl: './slice-heatmap.component.scss'
})
export class SliceHeatmapComponent implements OnInit, OnChanges, OnDestroy {
  @Input() zIndex = 0;
  @Input() xCoords: number[] = [];
  @Input() yCoords: number[] = [];
  @Input() classes: number[] = [];
  @ViewChild('plot', { static: true }) plotElement!: ElementRef;
  
  private readonly apiService = inject(ApiService);
  private readonly colorService = inject(ColorService);
  private isPlotInitialized = false;
  private readonly destroy$ = new Subject<void>();
  private readonly zIndex$ = new Subject<number>();

  ngOnInit() {
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
      this.updateColorscale();
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
    const { colorscale, zmin, zmax, tickvals, ticktext } =
      this.colorService.buildDiscreteColorscale(this.classes);

    const trace: Partial<Data> = {
      type: 'heatmap',
      x: this.xCoords,
      y: this.yCoords,
      z: data,
      colorscale: colorscale as ColorScale,
      zmin,
      zmax,
      zsmooth: false,
      showscale: true,
      colorbar: {
        tickvals,
        ticktext
      }
    };

    if (!this.isPlotInitialized) {
      this.createPlot(trace, z_val);
      this.isPlotInitialized = true;
    } else {
      this.restylePlot(data, z_val);
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

  private updateColorscale() {
    const { colorscale, zmin, zmax, tickvals, ticktext } =
      this.colorService.buildDiscreteColorscale(this.classes);
    Plotly.restyle(
      this.plotElement.nativeElement,
      {
        colorscale: [colorscale],
        zmin: [zmin],
        zmax: [zmax],
        zsmooth: [false],
        colorbar: [{ tickvals, ticktext }]
      },
      [0]
    );
  }
}
