import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, from, Observable } from "rxjs";
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
  private static readonly _webSocketUrl = environment.websocketUrl;
  private static readonly _startWebSocketsRoute = `http://${environment.serverAddress}:${environment.serverPort}/${environment.startWebSocketsRoute}`;
  private readonly _getCalibrationRoute = `http://${environment.serverAddress}:${environment.serverPort}/${environment.calibrationRoute}`;
  private readonly _getCameraConfigRoute = `http://${environment.serverAddress}:${environment.serverPort}/api/Tracking/SelectedCameraConfig`;
  

  public constructor() {
    super(inject(HttpClient), InteractionService._webSocketUrl, []);
  }

  public override startStreaming(): void {
    super.startStreaming();
  }

  public override stopStreaming(): void {
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
    return this.HttpClient.get<RawTransformation>(this._getCalibrationRoute, { headers: this.Headers }).pipe(
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
}
