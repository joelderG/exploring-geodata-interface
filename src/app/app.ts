import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CuttingPlaneComponent } from "@components/cutting-plane/cutting-plane.component";
import { ClassSelectorComponent } from '@components/class-selector/class-selector.component';
import { VolumeViewerComponent } from '@components/volume-viewer/volume-viewer.component';
import { ApiService } from '@services/api-service/api.service';
import { AppStateService } from '@services/app-state-service/app-state.service';

@Component({
  selector: 'app-root',
  imports: [CuttingPlaneComponent, ClassSelectorComponent, VolumeViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('reflex-geo-explore');
  private readonly apiService = inject(ApiService);
  private readonly appStateService = inject(AppStateService);

  protected zIndex = 0;
  protected xCoords: number[] = [];
  protected yCoords: number[] = [];
  protected zCoords: number[] = [];
  protected classes: number[] = [];

  ngOnInit() {
    this.apiService.getMeta().subscribe((metaData) => {
      this.xCoords = metaData.x_coords;
      this.yCoords = metaData.y_coords;
      this.zCoords = metaData.z_coords;
      this.classes = metaData.classes;
      this.zIndex = Math.floor(metaData.z_coords.length / 2);
      this.appStateService.initializeClasses(metaData.classes);
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
      this.appStateService.toggleClassVisibilityAtIndex(i);
    }
    if (e.key === 't' || e.key === 'T') {
      this.appStateService.toggleShowOnlyCurrentSlicePoints();
    }
  }
}
