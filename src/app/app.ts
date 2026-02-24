import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Test } from './test/test';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Test],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('reflex-geo-explore');
}
