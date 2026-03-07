import { BehaviorSubject } from "rxjs";

export interface IConnectionState {
    isConnected: BehaviorSubject<boolean>;
    isConnecting: BehaviorSubject<boolean>;
}