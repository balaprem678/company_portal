import { TestBed } from '@angular/core/testing';

import { ModalModalServiceService } from './modal-modal-service.service';

describe('ModalModalServiceService', () => {
  let service: ModalModalServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalModalServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
