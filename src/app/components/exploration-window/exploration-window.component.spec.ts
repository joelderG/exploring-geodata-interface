import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ExplorationWindowComponent } from './exploration-window.component';

describe('ExplorationWindowComponent', () => {
  let component: ExplorationWindowComponent;
  let fixture: ComponentFixture<ExplorationWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplorationWindowComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExplorationWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
