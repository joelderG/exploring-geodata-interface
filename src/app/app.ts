import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CuttingPlaneComponent } from "@components/cutting-plane/cutting-plane.component";
import { ClassSelectorComponent } from '@components/class-selector/class-selector.component';
import { VolumeViewerComponent } from '@components/volume-viewer/volume-viewer.component';
import { SettingsComponent } from '@components/settings/settings.component';
import { TouchpointsDebugComponent } from '@components/touchpoints-debug/touchpoints-debug.component';
import { ApiService } from '@services/api/api.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { DepthInteractionService } from '@services/depth-interaction/depth-interaction.service';
import { GestureActionService } from './gestures/gesture-action.service';
import { distinctUntilChanged, Subscription } from 'rxjs';
import { ClassInfo } from '@services/api/api.types';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

import { ensureSliceIndexInBounds, getAxisLengthForOrientation, getInitialSliceIndexForOrientation, normalizedZToSliceIndex } from './shared/util/cutting-plane.utils';
import { VolumeCoordinates } from '@shared/interface/volume-coordinates';

@Component({
  selector: 'app-root',
  imports: [
    CuttingPlaneComponent,
    ClassSelectorComponent,
    VolumeViewerComponent,
    SettingsComponent,
    TouchpointsDebugComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('reflex-geo-explore');

  private readonly subscriptions: Subscription = new Subscription;
  private readonly apiService = inject(ApiService);
  private readonly appStateService = inject(AppStateService);
  private readonly depthInteractionService = inject(DepthInteractionService);
  private readonly gestureActionService = inject(GestureActionService);
  protected isTouchpointsDebugVisible = false;
  private readonly volumeViewerVisibilityMs = 3000;
  private hideVolumeViewerTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected zIndex = 0;
  protected cuttingPlaneOrientation: CuttingPlaneOrientation = CuttingPlaneOrientation.XY;
  protected isVolumeViewerVisible = false;
  private isVolumeViewerAlwaysVisible = false;
  // TODO: add decent destructuring of object when needed 
  protected coordinates: VolumeCoordinates = { xCoordinates: [], yCoordinates: [], zCoordinates: [] };
  protected classes: number[] = [];
  protected classesInfo: ClassInfo[] = [];

  ngOnInit() {
    this.subscriptions.add(this.appStateService.cuttingPlaneOrientation$
      .pipe(distinctUntilChanged())
      .subscribe((orientation) => {
        this.cuttingPlaneOrientation = orientation;
        const initialIndex = getInitialSliceIndexForOrientation(orientation, this.coordinates);
        this.zIndex = ensureSliceIndexInBounds(
          initialIndex,
          this.coordinates,
          this.cuttingPlaneOrientation
        );
      }));

    this.subscriptions.add(this.appStateService.volumeViewerAlwaysVisible$
      .pipe(distinctUntilChanged())
      .subscribe((isAlwaysVisible) => {
        this.isVolumeViewerAlwaysVisible = isAlwaysVisible;
        if (this.hideVolumeViewerTimeoutId) {
          clearTimeout(this.hideVolumeViewerTimeoutId);
          this.hideVolumeViewerTimeoutId = null;
        }

        this.isVolumeViewerVisible = isAlwaysVisible;
      }));

    this.subscriptions.add(this.apiService.getMeta().subscribe((metaData) => {
      this.coordinates.xCoordinates = metaData.x_coords;
      this.coordinates.yCoordinates = metaData.y_coords;
      this.coordinates.zCoordinates = metaData.z_coords;
      this.classes = metaData.classes;
      this.classesInfo = metaData.class_info;
      this.zIndex = getInitialSliceIndexForOrientation(this.cuttingPlaneOrientation, this.coordinates);
      this.appStateService.initializeClasses(metaData.classes);
    }));

    this.subscriptions.add(this.appStateService.touchpointsDebugVisible$.subscribe((isVisible) => {
      this.isTouchpointsDebugVisible = isVisible;
    }));

    this.subscriptions.add(this.depthInteractionService.currentDeepestPoint$
      .pipe(distinctUntilChanged((a, b) => (a?.TouchId === b?.TouchId) && (a?.Position?.Z === b?.Position?.Z)))
      .subscribe((point) => {
        const zNormalized = point?.Position?.Z;
        const nextZIndex = normalizedZToSliceIndex(
          zNormalized ?? NaN,
          this.cuttingPlaneOrientation,
          this.coordinates
        );
        if (nextZIndex === null) return;
        this.updateZIndex(nextZIndex);
      }));
  }

  ngOnDestroy() {
    if (this.hideVolumeViewerTimeoutId) {
      clearTimeout(this.hideVolumeViewerTimeoutId);
      this.hideVolumeViewerTimeoutId = null;
    }

    this.subscriptions.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
      if (axisLength <= 0) return;
      const nextZIndex = Math.min(this.zIndex + 1, axisLength - 1);
      this.updateZIndex(nextZIndex);
    }
    if (e.key === 'ArrowDown') {
      const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
      if (axisLength <= 0) return;
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
    const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
    if (axisLength <= 0) return;
    const clamped = Math.min(Math.max(nextZIndex, 0), axisLength - 1);
    if (clamped === this.zIndex) return;
    this.zIndex = clamped;
    this.showVolumeViewerTemporarily();
  }

  private showVolumeViewerTemporarily() {
    if (this.isVolumeViewerAlwaysVisible) {
      this.isVolumeViewerVisible = true;
      return;
    }

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
