import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SliceHeatmapComponent } from './slice-heatmap.component';

describe('SliceHeatmapComponent', () => {
  let component: SliceHeatmapComponent;
  let fixture: ComponentFixture<SliceHeatmapComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
      imports: [SliceHeatmapComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SliceHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
