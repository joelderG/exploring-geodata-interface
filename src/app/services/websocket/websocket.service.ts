import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, combineLatest, concatMap, delay, distinctUntilChanged, filter, Observable, Observer, Subscription, tap } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { IConnectionState } from 'app/shared/interface/connectionState.interface';

export abstract class WebSocketService<T> implements IConnectionState {
  public Data: BehaviorSubject<T>;

  public numFramesReceived = 0;

  public isConnected = new BehaviorSubject<boolean>(false);
  public isConnecting = new BehaviorSubject<boolean>(false);

  private _websocketObserver: Observer<MessageEvent>;

  protected _depthImageSubscription? : Subscription; 
  private _reconnectSubscription?: Subscription;

  protected readonly Headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  protected Socket?: WebSocketSubject<unknown>;

  private readonly _streamDataRoute: string;
  

  public constructor(protected readonly HttpClient: HttpClient, route: string, defaultValue: T) {
    this.Data = new BehaviorSubject<T>(defaultValue);

    this._streamDataRoute = route;

    this._websocketObserver = {
      next: (val: MessageEvent) => {
        this.numFramesReceived++;
        this.update(val);
        this.isConnected.next(true);
        this.isConnecting.next(false);
      },
      error: (error: unknown) => {
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
          this._depthImageSubscription?.unsubscribe();        
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
    this._depthImageSubscription?.unsubscribe();
    this.Socket?.complete();
    this.isConnected.next(false);
    this.isConnecting.next(false);
  }

  protected abstract enableSocket(): Observable<object>;

  protected abstract disableSocket(): Observable<object>;

  private startSocket(): Observable<MessageEvent> {    
    this.Socket = webSocket<unknown>({
      url: this._streamDataRoute,
      deserializer: (value) => value,
      closeObserver: {
        next: (val) => {
          console.log(`closed: ${val}`);
          this.isConnected.next(false);
          this.isConnecting.next(false);
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

    return this.enableSocket().pipe(
      tap(() => this.Socket?.next('Start')),
      concatMap(() => this.Socket as Observable<MessageEvent>)
    );
  }

  protected abstract update(result: MessageEvent): void;
}
