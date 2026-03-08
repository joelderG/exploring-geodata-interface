import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CuttingPlaneComponent } from "@components/cutting-plane/cutting-plane.component";
import { ClassSelectorComponent } from '@components/class-selector/class-selector.component';
import { VolumeViewerComponent } from '@components/volume-viewer/volume-viewer.component';
import { SettingsComponent } from '@components/settings/settings.component';
import { ApiService } from '@services/api/api.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { InteractionService } from '@services/interaction/interaction.service';
import { distinctUntilChanged, skip, Subscription } from 'rxjs';
import { ClassInfo } from '@services/api/api.types';

@Component({
  selector: 'app-root',
  imports: [CuttingPlaneComponent, ClassSelectorComponent, VolumeViewerComponent, SettingsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('reflex-geo-explore');
  private readonly apiService = inject(ApiService);
  private readonly appStateService = inject(AppStateService);
  private readonly interactionService = inject(InteractionService);
  private dataSubscription: Subscription | undefined;
  private interactionStreamingSubscription: Subscription | undefined;
  private readonly volumeViewerVisibilityMs = 3000;
  private hideVolumeViewerTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected zIndex = 0;
  protected isVolumeViewerVisible = false;
  protected xCoords: number[] = [];
  protected yCoords: number[] = [];
  protected zCoords: number[] = [];
  protected classes: number[] = [];
  protected classesInfo: ClassInfo[] = [];

  ngOnInit() {
    this.interactionStreamingSubscription = this.appStateService.interactionStreamingActive$
      .pipe(distinctUntilChanged())
      .subscribe((isActive) => {
        if (isActive) {
          this.interactionService.startStreaming();
          return;
        }
        this.interactionService.stopStreaming();
      });

    this.apiService.getMeta().subscribe((metaData) => {
      this.xCoords = metaData.x_coords;
      this.yCoords = metaData.y_coords;
      this.zCoords = metaData.z_coords;
      this.classes = metaData.classes;
      this.classesInfo = metaData.class_info;
      this.zIndex = Math.floor(metaData.z_coords.length / 2);
      this.appStateService.initializeClasses(metaData.classes);
    });

    this.dataSubscription = this.interactionService.Data.pipe(skip(1)).subscribe((data) => {
      console.log(data);
    });
  }

  ngOnDestroy() {
    if (this.hideVolumeViewerTimeoutId) {
      clearTimeout(this.hideVolumeViewerTimeoutId);
      this.hideVolumeViewerTimeoutId = null;
    }

    this.dataSubscription?.unsubscribe();
    this.interactionStreamingSubscription?.unsubscribe();
    this.interactionService.stopStreaming();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      const nextZIndex = Math.min(this.zIndex + 1, this.zCoords.length - 1);
      this.updateZIndex(nextZIndex);
    }
    if (e.key === 'ArrowDown') {
      const nextZIndex = Math.max(this.zIndex - 1, 0);
      this.updateZIndex(nextZIndex);
    }
    if (e.key >= '0' && e.key <= '9') {
      const i = parseInt(e.key);
      this.appStateService.toggleClassVisibilityAtIndex(i);
    }
    if (e.key === 't' || e.key === 'T') {
      this.appStateService.toggleShowOnlyCurrentSlicePoints();
    }
    if (e.key === 's' || e.key === 'S') {
      this.appStateService.toggleSettingsPanelVisibility();
    }
  }

  private updateZIndex(nextZIndex: number) {
    if (nextZIndex === this.zIndex) return;
    this.zIndex = nextZIndex;
    this.showVolumeViewerTemporarily();
  }

  private showVolumeViewerTemporarily() {
    this.isVolumeViewerVisible = true;

    if (this.hideVolumeViewerTimeoutId) {
      clearTimeout(this.hideVolumeViewerTimeoutId);
    }

    this.hideVolumeViewerTimeoutId = setTimeout(() => {
      this.isVolumeViewerVisible = false;
      this.hideVolumeViewerTimeoutId = null;
    }, this.volumeViewerVisibilityMs);
  }
}
