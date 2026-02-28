import { Component, signal } from '@angular/core';
import { ModelViewerComponent } from "./model-viewer/model-viewer.component";

@Component({
  selector: 'app-root',
  imports: [ModelViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('reflex-geo-explore');
}
