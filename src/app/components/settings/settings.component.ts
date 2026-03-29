import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AppStateService } from '@services/app-state/app-state.service';
import { DepthInteractionService } from '@services/depth-interaction/depth-interaction.service';
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
  // SUBSCRIPTIONS
  private readonly subscriptions: Subscription = new Subscription;

  // SERVICES
  private readonly appStateService = inject(AppStateService);
  private readonly depthInteractionService = inject(DepthInteractionService);
  private readonly interactionService = inject(InteractionService);

  // ENUM
  protected readonly cuttingPlaneOrientationEnum = CuttingPlaneOrientation;

  // STATE VARIABLES
  protected isPanelVisible = false;
  protected isInteractionStreamingActive = false;
  protected isVolumeViewerAlwaysVisible = false;
  protected isTouchpointsDebugVisible = false;
  protected isGestureExplanationVisible = false;
  protected cuttingPlaneOrientation = CuttingPlaneOrientation.XY;
  protected interactionConnectionState: ConnectionState = ConnectionState.Disconnected;


  ngOnInit(): void {
    this.subscriptions.add(this.appStateService.settingsPanelVisible$.subscribe((isVisible) => {
      this.isPanelVisible = isVisible;
    }));

    this.subscriptions.add(this.appStateService.interactionStreamingActive$.subscribe((isActive) => {
      this.isInteractionStreamingActive = isActive;
    }));

    this.subscriptions.add(this.appStateService.volumeViewerAlwaysVisible$.subscribe((isAlwaysVisible) => {
      this.isVolumeViewerAlwaysVisible = isAlwaysVisible;
    }));

    this.subscriptions.add(this.appStateService.touchpointsDebugVisible$.subscribe((isVisible) => {
      this.isTouchpointsDebugVisible = isVisible;
    }));

    this.subscriptions.add(this.appStateService.gestureExplanationVisible$.subscribe((isVisible) => {
      this.isGestureExplanationVisible = isVisible;
    }))

    this.subscriptions.add(this.appStateService.cuttingPlaneOrientation$.subscribe((orientation) => {
      this.cuttingPlaneOrientation = orientation;
    }));

    this.subscriptions.add(
      combineLatest([this.interactionService.isConnected, this.interactionService.isConnecting])
        .subscribe({
          next: ([connected, connecting]) => {
            this.interactionConnectionState = connected === true
              ? ConnectionState.Connected
              : connecting === true ? ConnectionState.Connecting : ConnectionState.Disconnected;
          },
          error: () => this.interactionConnectionState = ConnectionState.Error
        }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  protected toggleInteractionService(): void {
    this.depthInteractionService.toggleStreaming();
  }

  protected toggleVolumeViewerVisibilityMode(): void {
    this.appStateService.toggleVolumeViewerAlwaysVisible();
  }

  protected toggleTouchpointsDebugVisibility(): void {
    this.appStateService.toggleTouchpointsDebugVisible();
  }

  protected setCuttingPlaneOrientation(orientation: CuttingPlaneOrientation): void {
    this.appStateService.setCuttingPlaneOrientation(orientation);
  }

  protected toggleGestureExplanationVisible(): void {
    this.appStateService.toggleGestureExplanationVisible();
  }
}
