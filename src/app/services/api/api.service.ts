import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MetaData, Volume } from './api.types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private root = "http://127.0.0.1:8000";

  getMeta() {
    return this.http.get<MetaData>(`${this.root}/meta`);
  }

  getVolume() {
    return this.http.get<Volume>(`${this.root}/volume`);
  }
}
