import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestureExplanationComponent } from './gesture-explanation.component';

describe('GestureExplanationComponent', () => {
  let component: GestureExplanationComponent;
  let fixture: ComponentFixture<GestureExplanationComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
      imports: [GestureExplanationComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GestureExplanationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
