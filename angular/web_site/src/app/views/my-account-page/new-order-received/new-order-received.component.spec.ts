import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewOrderReceivedComponent } from './new-order-received.component';

describe('NewOrderReceivedComponent', () => {
  let component: NewOrderReceivedComponent;
  let fixture: ComponentFixture<NewOrderReceivedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewOrderReceivedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewOrderReceivedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
