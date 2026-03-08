import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MetaData, Slice, Volume } from './api.types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private root = "http://127.0.0.1:8000";

  getMeta() {
    return this.http.get<MetaData>(`${this.root}/meta`);
  }

  getSlice(zIndex: number) {
    return this.http.get<Slice>(`${this.root}/slice/${zIndex}`);
  }

  getVolume() {
    return this.http.get<Volume>(`${this.root}/volume`);
  }
}
