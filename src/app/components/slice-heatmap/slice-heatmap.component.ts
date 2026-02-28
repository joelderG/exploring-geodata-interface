import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '@services/api-service/api.service';

@Component({
  selector: 'app-slice-heatmap',
  imports: [],
  templateUrl: './slice-heatmap.component.html',
  styleUrl: './slice-heatmap.component.scss'
})
export class SliceHeatmapComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  ngOnInit() {
    this.apiService.getMeta().subscribe((meta) => {
      console.log("Metadaten: ", meta);
    });

    this.apiService.getSlice(1).subscribe((slice) => {
      console.log("Slice 1: ", slice);
    });
    
    this.apiService.getVolume().subscribe((volume) => {
      console.log("Volume: ", volume);
    });
  }
}
