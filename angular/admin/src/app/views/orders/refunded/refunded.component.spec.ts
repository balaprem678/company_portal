import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefundedComponent } from './refunded.component';

describe('RefundedComponent', () => {
  let component: RefundedComponent;
  let fixture: ComponentFixture<RefundedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RefundedComponent]
    });
    fixture = TestBed.createComponent(RefundedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
