import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, from, Observable, interval, Subscription } from "rxjs";
import { environment } from "app/environments/environment";
import { CameraConfig } from "app/shared/interface/camera-config";
import { NetworkSettings } from "app/shared/model/network-settings";
import { TouchPoint } from "app/shared/model/touch-point";
import { Transformation } from "app/shared/model/transformation";
import { RawTransformation } from "app/shared/model/transformation.raw";
import { WebSocketService } from "@services/websocket/websocket.service";
import * as THREE from "three";

@Injectable()
export class InteractionService extends WebSocketService<TouchPoint[]> { 
  private readonly httpClient = inject(HttpClient);
  private static readonly _webSocketUrl = environment.websocketUrl;
  private static readonly _startWebSocketsRoute = `http://${environment.serverAddress}:${environment.serverPort}/${environment.startWebSocketsRoute}`;
  private readonly _getCalibrationRoute = `http://${environment.serverAddress}:${environment.serverPort}/${environment.calibrationRoute}`;
  private readonly _getCameraConfigRoute = `http://${environment.serverAddress}:${environment.serverPort}/api/Tracking/SelectedCameraConfig`;
  private mockSubscription?: Subscription;
  

  public constructor() {
    super(inject(HttpClient), InteractionService._webSocketUrl, []);
  }

  public override startStreaming(): void {
    if (environment.useMockTouchpoints) {
      this.startMockStreaming();
      return;
    }
    super.startStreaming();
  }

  public override stopStreaming(): void {
    if (environment.useMockTouchpoints) {
      this.stopMockStreaming();
      return;
    }
    super.stopStreaming();
  }

  protected enableSocket(): Observable<object> {
    return this.activateWebSockets();
  }

  protected disableSocket(): Observable<object> {
    return from([]);
  }
    
  protected update(result: MessageEvent): void {
    this.Data.next(JSON.parse(result.data) as TouchPoint[]);
  }

  public getCalibration(): Observable<Transformation> {
    return this.httpClient.get<RawTransformation>(this._getCalibrationRoute, { headers: this.Headers }).pipe(
      map(result => {
        const trans = result.transformation;
        const mat = new THREE.Matrix4();

        // convert into row-major column needed by three.js
        // remark: for extracting scale/translation/rotation, three, needs a 4x4 matrix; to achieve this, 
        // the translation factors are moved to the 4th column        
        mat.set(
          trans[0][0], trans[0][1], trans[0][3], trans[0][2],
          trans[1][0], trans[1][1], trans[1][3], trans[1][2],
          trans[2][0], trans[2][1], trans[2][2], trans[2][3],
          trans[3][0], trans[3][1], trans[3][2], trans[3][3]
        );
        
        const t = new THREE.Vector3();
        const s = new THREE.Vector3();
        const r = new THREE.Quaternion(); 
        mat.decompose(t, r, s);

        return {
          scale: s,
          rotation: r,
          translation: t
        };
      })
    );
  }

  public getCameraConfig(): Observable<CameraConfig> {
    return this.HttpClient.get<CameraConfig>(this._getCameraConfigRoute, { headers: this.Headers });
  }
  
  private activateWebSockets() {
    return this.HttpClient.post<NetworkSettings>(
      InteractionService._startWebSocketsRoute,
      environment.networkingConfig,
      { headers: this.Headers }
    );
  }

  private startMockStreaming(): void {
    if (this.mockSubscription) return;
    this.isConnecting.next(false);
    this.isConnected.next(true);
    const startMs = Date.now();

    this.mockSubscription = interval(60).subscribe(() => {
      const elapsedMs = Date.now() - startMs;
      const t = elapsedMs / 1000;
      const z1 = -((1 - Math.cos(t * 0.8)) / 2);

      const now = BigInt(Date.now());

      const points: TouchPoint[] = [
        {
          TouchId: 1,
          Position: { X: 0.2, Y: 0.4, Z: z1, IsFiltered: false, IsValid: true },
          ExtremumDescription: { Type: 0, NumFittingPoints: 0, PercentageFittingPoints: 0 },
          Time: now,
          Confidence: 1,
          Type: 0
        }
      ];

      this.numFramesReceived++;
      this.Data.next(points);
    });
  }

  private stopMockStreaming(): void {
    this.mockSubscription?.unsubscribe();
    this.mockSubscription = undefined;
    this.isConnected.next(false);
    this.isConnecting.next(false);
  }
}
