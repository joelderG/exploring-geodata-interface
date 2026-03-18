import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { GestureEngineService } from './gesture-engine.service';
import { AppStateService } from '@services/app-state/app-state.service';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

@Injectable({ providedIn: 'root' })
export class GestureActionService {
  private readonly gestureEngine = inject(GestureEngineService);
  private readonly appStateService = inject(AppStateService);
  private readonly subscription = new Subscription();

  constructor() {
    this.subscription.add(
      this.gestureEngine.events$.subscribe((event) => {
        if (event.type === 'swipe-left-right') {
          this.appStateService.setCuttingPlaneOrientation(CuttingPlaneOrientation.YZ);
        }
      })
    );
  }
}
