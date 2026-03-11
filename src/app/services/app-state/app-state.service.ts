import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

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
  private readonly cuttingPlaneOrientationSubject = new BehaviorSubject<CuttingPlaneOrientation>(CuttingPlaneOrientation.XY);

  readonly classes$ = this.classesSubject.asObservable();
  readonly classVisibility$ = this.classVisibilitySubject.asObservable();
  readonly showOnlyCurrentSlicePoints$ = this.showOnlyCurrentSlicePointsSubject.asObservable();
  readonly settingsPanelVisible$ = this.settingsPanelVisibleSubject.asObservable();
  readonly interactionStreamingActive$ = this.interactionStreamingActiveSubject.asObservable();
  readonly volumeViewerAlwaysVisible$ = this.volumeViewerAlwaysVisibleSubject.asObservable();
  readonly cuttingPlaneOrientation$ = this.cuttingPlaneOrientationSubject.asObservable();
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

  setOnlyClassVisible(index: number): void {
    const current = this.classVisibilitySubject.value;
    if (index < 0 || index >= current.length) return;

    const next = current.map((_, i) => i === index);
    this.classVisibilitySubject.next(next);
  }

  toggleShowOnlyCurrentSlicePoints(): void {
    this.showOnlyCurrentSlicePointsSubject.next(!this.showOnlyCurrentSlicePointsSubject.value);
  }

  toggleSettingsPanelVisibility(): void {
    this.settingsPanelVisibleSubject.next(!this.settingsPanelVisibleSubject.value);
  }

  setSettingsPanelVisibility(isVisible: boolean): void {
    this.settingsPanelVisibleSubject.next(isVisible);
  }

  toggleInteractionStreamingActive(): void {
    this.interactionStreamingActiveSubject.next(!this.interactionStreamingActiveSubject.value);
  }

  setInteractionStreamingActive(isActive: boolean): void {
    this.interactionStreamingActiveSubject.next(isActive);
  }

  toggleVolumeViewerAlwaysVisible(): void {
    this.volumeViewerAlwaysVisibleSubject.next(!this.volumeViewerAlwaysVisibleSubject.value);
  }

  setVolumeViewerAlwaysVisible(isVisible: boolean): void {
    this.volumeViewerAlwaysVisibleSubject.next(isVisible);
  }

  setCuttingPlaneOrientation(orientation: CuttingPlaneOrientation): void {
    this.cuttingPlaneOrientationSubject.next(orientation);
  }
}
