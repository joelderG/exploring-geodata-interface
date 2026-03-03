import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { SliceHeatmapComponent } from "@components/slice-heatmap/slice-heatmap.component";
import { VolumeViewerComponent } from '@components/volume-viewer/volume-viewer.component';
import { ApiService } from '@services/api-service/api.service';

@Component({
  selector: 'app-root',
  imports: [SliceHeatmapComponent, VolumeViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('reflex-geo-explore');
  private readonly apiService = inject(ApiService);

  protected zIndex = 0;
  protected xCoords: number[] = [];
  protected yCoords: number[] = [];
  protected zCoords: number[] = [];
  protected classes: number[] = [];
  protected classVisible: boolean[] = [];

  ngOnInit() {
    this.apiService.getMeta().subscribe((metaData) => {
      this.xCoords = metaData.x_coords;
      this.yCoords = metaData.y_coords;
      this.zCoords = metaData.z_coords;
      this.classes = metaData.classes;
      this.zIndex = Math.floor(metaData.z_coords.length / 2);
      this.classVisible = new Array(metaData.classes.length).fill(true);
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowUp')
      this.zIndex = Math.min(this.zIndex + 1, this.zCoords.length - 1);
    if (e.key === 'ArrowDown')
      this.zIndex = Math.max(this.zIndex - 1, 0);
    if (e.key >= '0' && e.key <= '9') {
      const i = parseInt(e.key);
      if (i < this.classVisible.length) {
        const updated = [...this.classVisible];
        updated[i] = !updated[i];
        this.classVisible = updated;
      }
    }
  }
}
