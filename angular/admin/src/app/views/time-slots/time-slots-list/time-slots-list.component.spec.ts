import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeSlotsListComponent } from './time-slots-list.component';

describe('TimeSlotsListComponent', () => {
  let component: TimeSlotsListComponent;
  let fixture: ComponentFixture<TimeSlotsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimeSlotsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeSlotsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
