import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderpickupComponent } from './orderpickup.component';

describe('OrderpickupComponent', () => {
  let component: OrderpickupComponent;
  let fixture: ComponentFixture<OrderpickupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OrderpickupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderpickupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
