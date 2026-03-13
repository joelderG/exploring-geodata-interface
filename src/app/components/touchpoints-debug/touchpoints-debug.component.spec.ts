import { TestBed } from '@angular/core/testing';
import { TouchpointsDebugComponent } from './touchpoints-debug.component';

describe('TouchpointsDebugComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TouchpointsDebugComponent]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TouchpointsDebugComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
