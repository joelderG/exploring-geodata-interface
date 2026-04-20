import { TestBed } from '@angular/core/testing';

import { DepthInteractionService } from './depth-interaction.service';

describe('ColorService', () => {
  let service: DepthInteractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepthInteractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
