import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TouchpointMarkersComponent } from './touchpoint-markers.component';

describe('ClassSelectorComponent', () => {
  let component: TouchpointMarkersComponent;
  let fixture: ComponentFixture<TouchpointMarkersComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
      imports: [TouchpointMarkersComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TouchpointMarkersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
