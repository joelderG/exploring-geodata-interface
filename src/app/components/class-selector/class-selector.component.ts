import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ClassInfo } from '@services/api/api.types';
import { AppStateService } from '@services/app-state/app-state.service';
import { ColorService } from '@services/color/color.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-class-selector',
  imports: [],
  templateUrl: './class-selector.component.html',
  styleUrl: './class-selector.component.scss'
})
export class ClassSelectorComponent implements OnInit, OnDestroy {
  @Input() classes: number[] = [];
  @Input() classesInfo: ClassInfo[] = [];
  @Input() visibleClassIndices: number[] | null = null;
  @Input() contextMenuClassIndex: number | null = null;

  private readonly subscription: Subscription = new Subscription;

  private readonly appStateService = inject(AppStateService);
  private readonly colorService = inject(ColorService);
  
  protected classVisible: boolean[] = [];

  ngOnInit() {
    this.subscription.add(this.appStateService.classVisibility$
      .subscribe((classVisible) => {
        this.classVisible = classVisible;
      }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  protected isVisible(index: number): boolean {
    return this.classVisible[index] ?? true;
  }

  protected getDisplayIndices(): number[] {
    if (this.visibleClassIndices !== null) {
      return this.visibleClassIndices;
    }
    return this.classes.map((_, index) => index);
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
