// Maps gesture events to app state changes (e.g., cutting-plane orientation).
import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { GestureEngineService } from './gesture-engine.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';
import { CuttingPlaneInteractionState } from '@shared/enum/cutting-plane-interaction-state';

@Injectable({ providedIn: 'root' })
export class GestureActionService {
  private readonly gestureEngine = inject(GestureEngineService);
  private readonly appStateService = inject(AppStateService);
  private readonly subscription = new Subscription();
  private isCuttingPlaneFrozen = false;

  constructor() {
    this.subscription.add(
      this.appStateService.cuttingPlaneInteractionState$.subscribe((state) => {
        this.isCuttingPlaneFrozen = state === CuttingPlaneInteractionState.Frozen;
      })
    );

    this.subscription.add(
      this.gestureEngine.events$.subscribe((event) => {
        if (this.isCuttingPlaneFrozen) return;
        if (event.type === 'swipe-left-right') {
          this.appStateService.setCuttingPlaneOrientation(CuttingPlaneOrientation.YZ);
        }
        if (event.type === 'swipe-top-bottom') {
          this.appStateService.setCuttingPlaneOrientation(CuttingPlaneOrientation.XY);
        }
        if (event.type === 'swipe-right-left') {
          this.appStateService.setCuttingPlaneOrientation(CuttingPlaneOrientation.XZ);
        }
        if (event.type === 'pull-out-reset') {
          this.appStateService.setAllClassesVisible();
        }
      })
    );
  }
}
