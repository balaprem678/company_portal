import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnReasonListComponent } from './return-reason-list.component';

describe('ReturnReasonListComponent', () => {
  let component: ReturnReasonListComponent;
  let fixture: ComponentFixture<ReturnReasonListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReturnReasonListComponent]
    });
    fixture = TestBed.createComponent(ReturnReasonListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
