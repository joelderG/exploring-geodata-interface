import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeViewerComponent } from './volume-viewer.component';

describe('VolumeViewerComponent', () => {
  let component: VolumeViewerComponent;
  let fixture: ComponentFixture<VolumeViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolumeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
