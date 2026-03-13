import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ClassInfo } from '@services/api/api.types';
import { AppStateService } from '@services/app-state/app-state.service';
import { ColorService } from '@services/color/color.service';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-class-selector',
  imports: [],
  templateUrl: './class-selector.component.html',
  styleUrl: './class-selector.component.scss'
})
export class ClassSelectorComponent implements OnInit, OnDestroy {
  @Input() classes: number[] = [];
  @Input() classesInfo: ClassInfo[] = [];

  private readonly subscription: Subscription = new Subscription;

  private readonly appStateService = inject(AppStateService);
  private readonly colorService = inject(ColorService);
  private readonly destroy$ = new Subject<void>();
  
  protected classVisible: boolean[] = [];

  ngOnInit() {
    this.subscription.add(this.appStateService.classVisibility$
      .pipe(takeUntil(this.destroy$))
      .subscribe((classVisible) => {
        this.classVisible = classVisible;
      }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected isVisible(index: number): boolean {
    return this.classVisible[index] ?? true;
  }

  protected toggle(index: number): void {
    this.appStateService.toggleClassVisibilityAtIndex(index);
  }

  protected setOnlyVisible(index: number): void {
    this.appStateService.setOnlyClassVisible(index);
  }

  protected getClassColor(index: number): string {
    return this.colorService.getColor(index);
  }
}
