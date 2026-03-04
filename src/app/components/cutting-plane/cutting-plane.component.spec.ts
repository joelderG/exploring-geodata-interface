import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuttingPlaneComponent } from './cutting-plane.component';

describe('CuttingPlaneComponent', () => {
  let component: CuttingPlaneComponent;
  let fixture: ComponentFixture<CuttingPlaneComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
      imports: [CuttingPlaneComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CuttingPlaneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
