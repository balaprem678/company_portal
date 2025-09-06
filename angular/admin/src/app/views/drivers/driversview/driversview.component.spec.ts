import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriversviewComponent } from './driversview.component';

describe('DriversviewComponent', () => {
  let component: DriversviewComponent;
  let fixture: ComponentFixture<DriversviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DriversviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DriversviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
