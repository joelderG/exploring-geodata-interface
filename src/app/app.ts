import { Component, signal } from '@angular/core';
import { SliceHeatmapComponent } from "@components/slice-heatmap/slice-heatmap.component";

@Component({
  selector: 'app-root',
  imports: [SliceHeatmapComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('reflex-geo-explore');
}
