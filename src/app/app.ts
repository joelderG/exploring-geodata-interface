import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CuttingPlaneComponent } from "@components/cutting-plane/cutting-plane.component";
import { ClassSelectorComponent } from '@components/class-selector/class-selector.component';
import { VolumeViewerComponent } from '@components/volume-viewer/volume-viewer.component';
import { SettingsComponent } from '@components/settings/settings.component';
import { TouchpointsDebugComponent } from '@components/touchpoints-debug/touchpoints-debug.component';
import { ExplorationWindowComponent } from '@components/exploration-window/exploration-window.component';
import { ContextMenuComponent } from '@components/context-menu/context-menu.component';
import { TouchpointMarkersComponent } from '@components/touchpoint-markers/touchpoint-markers.component';
import { ApiService } from '@services/api/api.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { DepthInteractionService } from '@services/depth-interaction/depth-interaction.service';
import { GestureEngineService } from '@services/gesture/gesture-engine.service';
import { GestureActionService } from '@services/gesture/gesture-action.service';
import { distinctUntilChanged, Subscription } from 'rxjs';
import { ClassInfo, Volume } from '@services/api/api.types';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { TouchPoint } from '@shared/model/touch-point';

import { ensureSliceIndexInBounds, getAxisLengthForOrientation, getInitialSliceIndexForOrientation, normalizedZToSliceIndex } from './shared/util/cutting-plane.utils';
import { VolumeCoordinates } from '@shared/interface/volume-coordinates';
import { normalizedToCoordinateIndex, NormalizedIndexResult } from '@shared/util/normalized-coordinate.utils';
import { CuttingPlaneInteractionState } from '@shared/enum/cutting-plane-interaction-state';
import { getValidSliceRange, SliceIndexRange } from '@shared/util/volume-slice.utils';

@Component({
  selector: 'app-root',
  imports: [
    CuttingPlaneComponent,
    ClassSelectorComponent,
    VolumeViewerComponent,
    SettingsComponent,
    TouchpointsDebugComponent,
    ExplorationWindowComponent,
    ContextMenuComponent,
    TouchpointMarkersComponent
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
  private readonly gestureEngine = inject(GestureEngineService);
  private readonly gestureActionService = inject(GestureActionService);
  protected isTouchpointsDebugVisible = false;
  protected deepestPoint: TouchPoint | null = null;
  protected secondaryDeepPoint: TouchPoint | null = null;
  private readonly volumeViewerVisibilityMs = 3000;
  private hideVolumeViewerTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected zIndex = 0;
  protected cuttingPlaneOrientation: CuttingPlaneOrientation = CuttingPlaneOrientation.XY;
  protected isVolumeViewerVisible = false;
  private isVolumeViewerAlwaysVisible = false;
  protected coordinates: VolumeCoordinates = { xCoordinates: [], yCoordinates: [], zCoordinates: [] };
  protected classes: number[] = [];
  protected classesInfo: ClassInfo[] = [];
  protected visibleClassIndices: number[] | null = null;
  protected contextMenuToggleEnabled = false;
  protected contextMenuClassIndex: number | null = null;
  private volume: Volume | null = null;
  private readonly noDataClass = -1;
  private cachedVolumeForSliceRange: Volume | null = null;
  private readonly validSliceRange = new Map<CuttingPlaneOrientation, SliceIndexRange>();
  protected isCuttingPlaneFrozen = false;

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
        this.zIndex = this.clampZIndexToData(this.zIndex);
        this.recomputeContextMenuText();
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
      this.zIndex = this.clampZIndexToData(this.zIndex);
      this.appStateService.initializeClasses(metaData.classes);
      this.recomputeContextMenuText();
    }));

    this.subscriptions.add(this.apiService.getVolume().subscribe((volume) => {
      this.volume = volume;
      this.cachedVolumeForSliceRange = null;
      this.validSliceRange.clear();
      this.zIndex = this.clampZIndexToData(this.zIndex);
      this.recomputeContextMenuText();
    }));

    this.subscriptions.add(this.appStateService.touchpointsDebugVisible$.subscribe((isVisible) => {
      this.isTouchpointsDebugVisible = isVisible;
    }));

    this.subscriptions.add(this.appStateService.cuttingPlaneInteractionState$
      .pipe(distinctUntilChanged())
      .subscribe((state) => {
        this.isCuttingPlaneFrozen = state === CuttingPlaneInteractionState.Frozen;
      }));

    this.subscriptions.add(this.depthInteractionService.currentDeepestPoint$
      .pipe(distinctUntilChanged((a, b) => (a?.TouchId === b?.TouchId) && (a?.Position?.Z === b?.Position?.Z)))
      .subscribe((point) => {
        this.deepestPoint = point;
        if (this.isCuttingPlaneFrozen) return;
        const zNormalized = point?.Position?.Z;
        const nextZIndex = normalizedZToSliceIndex(
          zNormalized ?? NaN,
          this.cuttingPlaneOrientation,
          this.coordinates
        );
        if (nextZIndex === null) return;
        this.updateZIndex(nextZIndex);
      }));

    this.subscriptions.add(this.depthInteractionService.currentSecondaryPoint$
      .pipe(distinctUntilChanged((a, b) => (
        (a?.TouchId === b?.TouchId) &&
        (a?.Position?.X === b?.Position?.X) &&
        (a?.Position?.Y === b?.Position?.Y) &&
        (a?.Position?.Z === b?.Position?.Z)
      )))
      .subscribe((point) => {
        this.secondaryDeepPoint = point;
        this.recomputeContextMenuText();
      }));

    this.subscriptions.add(this.gestureEngine.events$.subscribe((event) => {
      if (!this.secondaryDeepPoint) return;
      if (!this.contextMenuToggleEnabled) return;
      if (event.type === 'context-drag-left') {
        this.onContextMenuLeftSelected();
      }
      if (event.type === 'context-drag-right') {
        this.onContextMenuRightSelected();
      }
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
      if (this.isCuttingPlaneFrozen) return;
      const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
      if (axisLength <= 0) return;
      const nextZIndex = Math.min(this.zIndex + 1, axisLength - 1);
      this.updateZIndex(nextZIndex);
    }
    if (e.key === 'ArrowDown') {
      if (this.isCuttingPlaneFrozen) return;
      const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
      if (axisLength <= 0) return;
      const nextZIndex = Math.max(this.zIndex - 1, 0);
      this.updateZIndex(nextZIndex);
    }
    if (e.key === 's' || e.key === 'S') {
      this.appStateService.toggleSettingsPanelVisibility();
    }
  }

  private updateZIndex(nextZIndex: number) {
    const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
    if (axisLength <= 0) return;
    const clamped = this.clampZIndexToData(nextZIndex);
    if (clamped === this.zIndex) return;
    this.zIndex = clamped;
    this.showVolumeViewerTemporarily();
  }

  private clampZIndexToData(nextZIndex: number): number {
    const axisLength = getAxisLengthForOrientation(this.cuttingPlaneOrientation, this.coordinates);
    if (axisLength <= 0) return 0;
    const coordMax = Math.max(axisLength - 1, 0);
    let clamped = Math.min(Math.max(nextZIndex, 0), coordMax);

    const range = this.getValidSliceRangeForOrientation();
    if (!range) return clamped;

    let min = Math.min(range.min, coordMax);
    let max = Math.min(range.max, coordMax);
    if (min > max) {
      min = 0;
      max = coordMax;
    }

    clamped = Math.min(Math.max(clamped, min), max);
    return clamped;
  }

  private getValidSliceRangeForOrientation(): SliceIndexRange | null {
    if (!this.volume) return null;
    if (this.cachedVolumeForSliceRange !== this.volume) {
      this.cachedVolumeForSliceRange = this.volume;
      this.validSliceRange.clear();
    }
    const cached = this.validSliceRange.get(this.cuttingPlaneOrientation);
    if (cached) return cached;
    const range = getValidSliceRange(this.volume, this.cuttingPlaneOrientation, this.noDataClass);
    this.validSliceRange.set(this.cuttingPlaneOrientation, range);
    return range;
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

  protected onContextMenuLeftSelected(): void {
    this.toggleContextMenuClassVisibility();
  }

  protected onContextMenuRightSelected(): void {
    this.toggleContextMenuOtherClassesVisibility();
  }

  private toggleContextMenuClassVisibility(): void {
    if (this.contextMenuClassIndex === null) return;
    this.appStateService.toggleClassVisibilityAtIndex(this.contextMenuClassIndex);
  }

  private toggleContextMenuOtherClassesVisibility(): void {
    if (this.contextMenuClassIndex === null) return;
    this.appStateService.toggleOtherClassVisibilityAtIndex(this.contextMenuClassIndex);
  }

  private recomputeContextMenuText(): void {
    const classValue = this.getClassAtPoint(this.secondaryDeepPoint);
    if (classValue === null) {
      this.contextMenuClassIndex = null;
      this.contextMenuToggleEnabled = false;
      return;
    }

    const classIndex = this.classes.indexOf(classValue);
    this.contextMenuClassIndex = classIndex >= 0 ? classIndex : null;
    this.contextMenuToggleEnabled = this.contextMenuClassIndex !== null;
  }

  private getClassAtPoint(point: TouchPoint | null): number | null {
    if (!point || !this.volume) return null;

    const x = normalizedToCoordinateIndex(point.Position.X, this.coordinates.xCoordinates, { range: 'autoSigned' });
    const y = normalizedToCoordinateIndex(point.Position.Y, this.coordinates.yCoordinates, { range: 'autoSigned' });
    const z = normalizedToCoordinateIndex(point.Position.Z, this.coordinates.zCoordinates, {
      range: 'depth',
      invert: this.cuttingPlaneOrientation === CuttingPlaneOrientation.XY
    });

    if (!x || !y || !z) return null;
    return this.getClassAt(this.volume, x, y, z);
  }

  private getClassAt(
    volume: Volume,
    x: NormalizedIndexResult,
    y: NormalizedIndexResult,
    z: NormalizedIndexResult
  ): number | null {
    const zPlane = volume.data[z.index];
    const yRow = zPlane?.[y.index];
    const value = yRow?.[x.index];
    return typeof value === 'number' ? value : null;
  }

  protected onVisibleClassIndicesChange(indices: number[]): void {
    this.visibleClassIndices = indices;
  }
}
