import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppStateService } from '@services/app-state/app-state.service';
import { combineLatest, Subscription } from 'rxjs';
import { ConnectionState } from 'app/shared/enum/connection-state';
import { InteractionService } from '@services/interaction/interaction.service';
import { CuttingPlaneOrientation } from '@shared/enum/cutting-plane-orientation';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly appStateService = inject(AppStateService);
  private readonly interactionService = inject(InteractionService);
  protected readonly isPanelVisible = toSignal(this.appStateService.settingsPanelVisible$, {
    initialValue: false
  });
  protected readonly isInteractionStreamingActive = toSignal(
    this.appStateService.interactionStreamingActive$,
    {
      initialValue: false
    }
  );
  protected readonly cuttingPlaneOrientation = toSignal(this.appStateService.cuttingPlaneOrientation$, {
    initialValue: CuttingPlaneOrientation.XY
  });
  protected readonly cuttingPlaneOrientationEnum = CuttingPlaneOrientation;

  public interactionConnectionState: ConnectionState = ConnectionState.Disconnected;
  private _interactionConnectionStateSubscription?: Subscription;

  ngOnInit(): void {
    this._interactionConnectionStateSubscription =
      combineLatest([this.interactionService.isConnected, this.interactionService.isConnecting])
        .subscribe({
          next: ([connected, connecting]) => {
            this.interactionConnectionState = connected === true
              ? ConnectionState.Connected
              : connecting === true ? ConnectionState.Connecting : ConnectionState.Disconnected;
          },
          error: () => this.interactionConnectionState = ConnectionState.Error
        });
  }

  ngOnDestroy(): void {
    this._interactionConnectionStateSubscription?.unsubscribe();
  }

  protected toggleInteractionService(): void {
    this.appStateService.toggleInteractionStreamingActive();
  }

  protected setCuttingPlaneOrientation(orientation: CuttingPlaneOrientation): void {
    this.appStateService.setCuttingPlaneOrientation(orientation);
  }
}
