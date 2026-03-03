import { Component, ElementRef, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ApiService } from '@services/api-service/api.service';
import * as Plotly from 'plotly.js-dist-min';
import { Data, Layout } from 'plotly.js';
import { Volume } from '@services/api-service/api.types';
import { ColorService } from '@services/color-service/color.service';

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
  @Input() classVisible: boolean[] = [];
  @ViewChild('plot', { static: true }) plotElement!: ElementRef;

  private readonly apiService = inject(ApiService);
  private readonly colorService = inject(ColorService);
  private isPlotInitialized = false;
  private volume?: Volume;

  ngOnInit() {
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
    }

    if (changes['classVisible']) {
      this.updateVisibility();
    }
  }

  ngOnDestroy() {
    Plotly.purge(this.plotElement.nativeElement);
  }

  private buildPlot(volume: Volume) {
    const nz = volume.data.length;
    const ny = volume.data[0].length;
    const nx = volume.data[0][0].length;

    const traces: Partial<Data>[] = [];

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

    this.isPlotInitialized = true;
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
}
