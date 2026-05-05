import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { CuttingPlaneInteractionState } from '@shared/enum/cutting-plane-interaction-state';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private readonly classesSubject = new BehaviorSubject<number[]>([]);
  private readonly classVisibilitySubject = new BehaviorSubject<boolean[]>([]);
  private readonly showOnlyCurrentSlicePointsSubject = new BehaviorSubject<boolean>(false);
  private readonly settingsPanelVisibleSubject = new BehaviorSubject<boolean>(false);
  private readonly interactionStreamingActiveSubject = new BehaviorSubject<boolean>(false);
  private readonly volumeViewerAlwaysVisibleSubject = new BehaviorSubject<boolean>(false);
  private readonly touchpointsDebugVisibleSubject = new BehaviorSubject<boolean>(false);
  private readonly gestureExplanationVisibleSubject = new BehaviorSubject<boolean>(false);
  private readonly cuttingPlaneOrientationSubject = new BehaviorSubject<CuttingPlaneOrientation>(CuttingPlaneOrientation.XY);
  private readonly cuttingPlaneInteractionStateSubject = new BehaviorSubject<CuttingPlaneInteractionState>(CuttingPlaneInteractionState.Interactive);

  readonly classes$ = this.classesSubject.asObservable();
  readonly classVisibility$ = this.classVisibilitySubject.asObservable();
  readonly showOnlyCurrentSlicePoints$ = this.showOnlyCurrentSlicePointsSubject.asObservable();
  readonly settingsPanelVisible$ = this.settingsPanelVisibleSubject.asObservable();
  readonly interactionStreamingActive$ = this.interactionStreamingActiveSubject.asObservable();
  readonly volumeViewerAlwaysVisible$ = this.volumeViewerAlwaysVisibleSubject.asObservable();
  readonly touchpointsDebugVisible$ = this.touchpointsDebugVisibleSubject.asObservable();
  readonly gestureExplanationVisible$ = this.gestureExplanationVisibleSubject.asObservable();
  readonly cuttingPlaneOrientation$ = this.cuttingPlaneOrientationSubject.asObservable();
  readonly cuttingPlaneInteractionState$ = this.cuttingPlaneInteractionStateSubject.asObservable();
  readonly visibleClasses$ = combineLatest([this.classes$, this.classVisibility$]).pipe(
    map(([classes, visibility]) => classes.filter((_, index) => visibility[index] ?? true))
  );

  initializeClasses(classes: number[]): void {
    this.classesSubject.next([...classes]);
    this.classVisibilitySubject.next(new Array(classes.length).fill(true));
  }

  toggleClassVisibilityAtIndex(index: number): void {
    const current = this.classVisibilitySubject.value;
    if (index < 0 || index >= current.length) return;

    const next = [...current];
    next[index] = !next[index];
    this.classVisibilitySubject.next(next);
  }

  toggleOtherClassVisibilityAtIndex(index: number): void {
    const current = this.classVisibilitySubject.value;
    if (index < 0 || index >= current.length) return;

    const next = current.map((isVisible, i) => i === index ? isVisible : !isVisible);
    this.classVisibilitySubject.next(next);
  }

  setOnlyClassVisible(index: number): void {
    const current = this.classVisibilitySubject.value;
    if (index < 0 || index >= current.length) return;

    const next = current.map((_, i) => i === index);
    this.classVisibilitySubject.next(next);
  }

  setAllClassesVisible(): void {
    const current = this.classVisibilitySubject.value;
    if (current.length === 0) return;
    if (current.every(Boolean)) return;
    this.classVisibilitySubject.next(new Array(current.length).fill(true));
  }

  toggleSettingsPanelVisibility(): void {
    this.settingsPanelVisibleSubject.next(!this.settingsPanelVisibleSubject.value);
  }

  toggleInteractionStreamingActive(): void {
    this.interactionStreamingActiveSubject.next(!this.interactionStreamingActiveSubject.value);
  }

  toggleVolumeViewerAlwaysVisible(): void {
    this.volumeViewerAlwaysVisibleSubject.next(!this.volumeViewerAlwaysVisibleSubject.value);
  }

  toggleTouchpointsDebugVisible(): void {
    this.touchpointsDebugVisibleSubject.next(!this.touchpointsDebugVisibleSubject.value);
  }

  toggleGestureExplanationVisible(): void {
    this.gestureExplanationVisibleSubject.next(!this.gestureExplanationVisibleSubject.value);
  }

  setCuttingPlaneOrientation(orientation: CuttingPlaneOrientation): void {
    this.cuttingPlaneOrientationSubject.next(orientation);
  }

  setCuttingPlaneInteractionState(state: CuttingPlaneInteractionState): void {
    if (this.cuttingPlaneInteractionStateSubject.value === state) return;
    this.cuttingPlaneInteractionStateSubject.next(state);
  }
}
