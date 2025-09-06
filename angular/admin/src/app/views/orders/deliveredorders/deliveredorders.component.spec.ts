import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveredordersComponent } from './deliveredorders.component';

describe('DeliveredordersComponent', () => {
  let component: DeliveredordersComponent;
  let fixture: ComponentFixture<DeliveredordersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeliveredordersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeliveredordersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
