import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private readonly classesSubject = new BehaviorSubject<number[]>([]);
  private readonly classVisibilitySubject = new BehaviorSubject<boolean[]>([]);
  private readonly showOnlyCurrentSlicePointsSubject = new BehaviorSubject<boolean>(false);

  readonly classes$ = this.classesSubject.asObservable();
  readonly classVisibility$ = this.classVisibilitySubject.asObservable();
  readonly showOnlyCurrentSlicePoints$ = this.showOnlyCurrentSlicePointsSubject.asObservable();
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
}
