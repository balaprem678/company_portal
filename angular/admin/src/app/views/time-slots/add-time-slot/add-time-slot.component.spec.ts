import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTimeSlotComponent } from './add-time-slot.component';

describe('AddTimeSlotComponent', () => {
  let component: AddTimeSlotComponent;
  let fixture: ComponentFixture<AddTimeSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTimeSlotComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTimeSlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
