import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, combineLatest, concatMap, delay, distinctUntilChanged, filter, Observable, Observer, Subscription, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { IConnectionState } from 'app/shared/interface/connectionState.interface';

export abstract class WebSocketService<T> implements IConnectionState {
  public Data: BehaviorSubject<T>;

  public numFramesReceived = 0;

  public isConnected = new BehaviorSubject<boolean>(false);
  public isConnecting = new BehaviorSubject<boolean>(false);

  private _websocketObserver: Observer<any>;

  protected _depthImageSubscription? : Subscription; 
  private _reconnectSubscription?: Subscription;

  protected readonly Headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected Socket?: WebSocketSubject<any>;

  private readonly _streamDataRoute: string;
  

  public constructor(protected readonly HttpClient: HttpClient, route: string, defaultValue: T) {
    this.Data = new BehaviorSubject<T>(defaultValue);

    this._streamDataRoute = route;

    this._websocketObserver = {
      next: (val: any) => {
        this.numFramesReceived++;
        this.update(val as MessageEvent);
        this.isConnected.next(true);
        this.isConnecting.next(false);
      },
      error: (error: any) => {
        console.error(error);
        this.isConnected.next(false);
        this.isConnecting.next(false);
      },
      complete: () => {
        const msg = 'completed depth image subscription...';
        console.info(msg);
      }
    };

    
  }

  public startStreaming() {
    this._reconnectSubscription = 
      combineLatest([this.isConnected, this.isConnecting]).pipe(
        distinctUntilChanged(),
        filter(([connected, connecting]) => connected === false && connecting === false),
        tap(() => this.isConnecting.next(true)),
        delay(2000),
        tap(() => {        
          this._depthImageSubscription = this.startSocket().subscribe(this._websocketObserver);
        })        
      ).subscribe(
        {
          error: (error) => {
            console.error(error);
          }
        }
      );
  }

  public stopStreaming() {
    this._reconnectSubscription?.unsubscribe();
  }

  protected abstract enableSocket(): Observable<object>;

  protected abstract disableSocket(): Observable<object>;

  private startSocket(): Observable<MessageEvent> {    
    this.Socket = webSocket({
      url: this._streamDataRoute,
      deserializer: (value) => value,
      closeObserver: {
        next: (val) => {
          const closeMsg = `closed subscription to depth image service: ${val}`;
          console.log(closeMsg);
        },
        error: (error: any) => {
          console.error(error);
        }
      },
      openObserver: {
        next: (val) => {
          const openMsg = `opened subscription to depth image service: ${val}`;
          console.log(openMsg); 
        },
        error: (error) => {
          const errorMsg = `Error when opening WebSocket: ${error}`;
          console.error(errorMsg);
        }
      }
    });

    this.Socket?.next('Start');

    return this.enableSocket().pipe(
      concatMap(() => this.Socket as Observable<MessageEvent>));
  }

  protected abstract update(result: MessageEvent): void;
}
